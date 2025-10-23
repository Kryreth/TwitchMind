import type { IStorage } from "./storage";
import type { ChatMessage, UserInsight, Settings } from "@shared/schema";

export interface MessageBuffer {
  messages: ChatMessage[];
  userMessageCounts: Map<string, number>;
}

export type SelectionStrategy = "most_active" | "random" | "new_chatter";

export type DachiStreamStatus = "idle" | "collecting" | "processing" | "selecting_message" | "building_context" | "waiting_for_ai" | "disabled" | "paused";

export interface DachiStreamLog {
  timestamp: Date;
  type: "info" | "status" | "message" | "selection" | "ai_response" | "error";
  message: string;
  data?: any;
}

export interface DachiStreamState {
  status: DachiStreamStatus;
  bufferCount: number;
  lastCycleTime: Date | null;
  nextCycleTime: Date | null;
  secondsUntilNextCycle: number;
  selectedMessage: ChatMessage | null;
  aiResponse: string | null;
  error: string | null;
}

export class DachiStreamService {
  private storage: IStorage;
  private messageBuffer: MessageBuffer = {
    messages: [],
    userMessageCounts: new Map(),
  };
  private intervalId: NodeJS.Timeout | null = null;
  private isPaused: boolean = false;
  private onMessageSelected?: (message: ChatMessage, context: string) => Promise<void>;
  
  private currentStatus: DachiStreamStatus = "idle";
  private logs: DachiStreamLog[] = [];
  private maxLogs = 100;
  private lastCycleTime: Date | null = null;
  private onStatusChange?: (state: DachiStreamState) => void;
  private cycleIntervalSeconds: number = 15;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async start(onMessageSelected: (message: ChatMessage, context: string) => Promise<void>, onStatusChange?: (state: DachiStreamState) => void) {
    this.onMessageSelected = onMessageSelected;
    this.onStatusChange = onStatusChange;
    
    // Fetch cycle interval from settings
    const allSettings = await this.storage.getSettings();
    const settings = allSettings[0];
    if (settings && settings.dachiastreamCycleInterval) {
      this.cycleIntervalSeconds = settings.dachiastreamCycleInterval;
    }
    
    // Start interval with configured cycle time
    this.intervalId = setInterval(() => {
      this.processBuffer();
    }, this.cycleIntervalSeconds * 1000);
    
    this.addLog("info", `DachiStream service started (${this.cycleIntervalSeconds}-second cycle)`);
    this.updateStatus("collecting");
    console.log(`DachiStream service started (${this.cycleIntervalSeconds}-second cycle)`);
  }

  updateCycleInterval(intervalSeconds: number) {
    if (intervalSeconds < 5 || intervalSeconds > 60) {
      console.warn("Cycle interval must be between 5 and 60 seconds");
      return;
    }
    
    this.cycleIntervalSeconds = intervalSeconds;
    
    // Restart the interval with new timing
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => {
        this.processBuffer();
      }, this.cycleIntervalSeconds * 1000);
      
      this.addLog("info", `Cycle interval updated to ${this.cycleIntervalSeconds} seconds`);
      console.log(`DachiStream cycle interval updated to ${this.cycleIntervalSeconds} seconds`);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.addLog("info", "DachiStream service stopped");
    this.updateStatus("idle");
    console.log("DachiStream service stopped");
  }

  pause() {
    this.isPaused = true;
    this.addLog("status", "DachiStream paused");
    this.updateStatus("paused");
    console.log("DachiStream paused");
  }

  resume() {
    this.isPaused = false;
    this.addLog("status", "DachiStream resumed");
    this.updateStatus("collecting");
    console.log("DachiStream resumed");
  }

  addMessage(message: ChatMessage) {
    // Add to buffer
    this.messageBuffer.messages.push(message);
    
    // Update user message count
    if (message.userId) {
      const currentCount = this.messageBuffer.userMessageCounts.get(message.userId) || 0;
      this.messageBuffer.userMessageCounts.set(message.userId, currentCount + 1);
    }
    
    this.addLog("message", `Message added to buffer from ${message.username}`, { 
      message: message.message,
      bufferSize: this.messageBuffer.messages.length 
    });
    this.broadcastState();
  }

  private async processBuffer() {
    this.lastCycleTime = new Date();
    this.addLog("info", `Processing cycle started - ${this.messageBuffer.messages.length} messages in buffer`);
    
    // Skip if paused or no messages
    if (this.isPaused) {
      this.addLog("status", "Cycle skipped - service is paused");
      this.updateStatus("paused");
      return;
    }
    
    if (this.messageBuffer.messages.length === 0) {
      this.addLog("info", "Cycle skipped - no messages in buffer");
      this.updateStatus("collecting");
      this.broadcastState();
      return;
    }

    try {
      this.updateStatus("processing");
      
      // Get current settings (returns array, take first)
      const allSettings = await this.storage.getSettings();
      const settings = allSettings[0];
      
      if (!settings || !settings.dachipoolEnabled) {
        this.addLog("status", "DachiPool is disabled - clearing buffer");
        this.updateStatus("disabled");
        this.clearBuffer();
        return;
      }

      this.updateStatus("selecting_message");
      this.addLog("info", `Using selection strategy: ${settings.dachiastreamSelectionStrategy}`);
      
      // Select message based on strategy
      const selectedMessage = await this.selectMessage(
        settings.dachiastreamSelectionStrategy as SelectionStrategy
      );

      if (selectedMessage) {
        this.addLog("selection", `Selected message from ${selectedMessage.username}: "${selectedMessage.message}"`, {
          username: selectedMessage.username,
          message: selectedMessage.message,
          strategy: settings.dachiastreamSelectionStrategy
        });
        
        this.updateStatus("building_context");
        // Build AI context
        const context = await this.buildAIContext(selectedMessage, settings);
        this.addLog("info", "AI context built successfully");

        this.updateStatus("waiting_for_ai");
        // Trigger AI response callback
        if (this.onMessageSelected) {
          await this.onMessageSelected(selectedMessage, context);
        }
      } else {
        this.addLog("info", "No message selected from buffer");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog("error", `Error processing DachiStream buffer: ${errorMessage}`, { error });
      console.error("Error processing DachiStream buffer:", error);
    } finally {
      // Clear buffer for next cycle
      this.clearBuffer();
      this.updateStatus("collecting");
      this.addLog("info", "Buffer cleared - waiting for next cycle");
    }
  }

  private async selectMessage(strategy: SelectionStrategy): Promise<ChatMessage | null> {
    const { messages } = this.messageBuffer;
    
    if (messages.length === 0) {
      return null;
    }

    switch (strategy) {
      case "most_active": {
        // Find user with most messages in this cycle
        let maxCount = 0;
        let mostActiveUserId: string | null = null;

        const entries = Array.from(this.messageBuffer.userMessageCounts.entries());
        for (const [userId, count] of entries) {
          if (count > maxCount) {
            maxCount = count;
            mostActiveUserId = userId;
          }
        }

        // Get the most recent message from that user
        if (mostActiveUserId) {
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].userId === mostActiveUserId) {
              return messages[i];
            }
          }
        }
        
        // Fallback to last message
        return messages[messages.length - 1];
      }

      case "random": {
        // Select random message
        const randomIndex = Math.floor(Math.random() * messages.length);
        return messages[randomIndex];
      }

      case "new_chatter": {
        // Prioritize users who haven't spoken much overall
        const userProfiles = await this.storage.getAllUserProfiles();
        const userInsights = await this.storage.getAllUserInsights();
        
        // Map userId to total message count
        const totalMessageCounts = new Map<string, number>();
        for (const insight of userInsights) {
          totalMessageCounts.set(insight.userId, insight.totalMessages);
        }

        // Find message from user with lowest total messages
        let selectedMessage = messages[0];
        let lowestCount = Infinity;

        for (const message of messages) {
          if (message.userId) {
            const count = totalMessageCounts.get(message.userId) || 0;
            if (count < lowestCount) {
              lowestCount = count;
              selectedMessage = message;
            }
          }
        }

        return selectedMessage;
      }

      default:
        return messages[messages.length - 1];
    }
  }

  private async buildAIContext(message: ChatMessage, settings: Settings): Promise<string> {
    const contextParts: string[] = [];

    // Add streamer voice-only mode info
    if (settings.streamerVoiceOnlyMode) {
      contextParts.push("STREAMER VOICE-ONLY MODE: Only respond if the streamer has spoken recently.");
    }

    // Add topic filters
    if (settings.topicAllowlist && Array.isArray(settings.topicAllowlist) && settings.topicAllowlist.length > 0) {
      contextParts.push(`ALLOWED TOPICS: ${settings.topicAllowlist.join(", ")}`);
    }
    if (settings.topicBlocklist && Array.isArray(settings.topicBlocklist) && settings.topicBlocklist.length > 0) {
      contextParts.push(`BLOCKED TOPICS: Avoid discussing ${settings.topicBlocklist.join(", ")}`);
    }

    // Add user personality if database personalization is enabled
    if (settings.useDatabasePersonalization && message.userId) {
      try {
        const userInsight = await this.storage.getUserInsight(message.userId);
        if (userInsight && userInsight.summary) {
          contextParts.push(`USER PERSONALITY (${message.username}): ${userInsight.summary}`);
        }
      } catch (error) {
        console.error("Error fetching user insight:", error);
      }
    }

    // Add recent chat context (last 10 messages)
    try {
      const recentMessages = await this.storage.getChatMessages(10);
      if (recentMessages.length > 0) {
        const chatHistory = recentMessages
          .reverse()
          .map(msg => `${msg.username}: ${msg.message}`)
          .join("\n");
        contextParts.push(`RECENT CHAT:\n${chatHistory}`);
      }
    } catch (error) {
      console.error("Error fetching recent messages:", error);
    }

    return contextParts.join("\n\n");
  }

  private clearBuffer() {
    this.messageBuffer.messages = [];
    this.messageBuffer.userMessageCounts.clear();
  }

  getBufferStatus() {
    return {
      messageCount: this.messageBuffer.messages.length,
      userCount: this.messageBuffer.userMessageCounts.size,
      isPaused: this.isPaused,
    };
  }
  
  private addLog(type: DachiStreamLog["type"], message: string, data?: any) {
    const log: DachiStreamLog = {
      timestamp: new Date(),
      type,
      message,
      data,
    };
    
    this.logs.push(log);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }
  
  private updateStatus(status: DachiStreamStatus) {
    this.currentStatus = status;
    this.broadcastState();
  }
  
  private broadcastState() {
    if (this.onStatusChange) {
      this.onStatusChange(this.getState());
    }
  }
  
  getState(): DachiStreamState {
    const nextCycleTime = this.lastCycleTime ? new Date(this.lastCycleTime.getTime() + 15000) : null;
    const now = new Date();
    const secondsUntilNextCycle = nextCycleTime 
      ? Math.max(0, Math.floor((nextCycleTime.getTime() - now.getTime()) / 1000))
      : 15;
    
    return {
      status: this.currentStatus,
      bufferCount: this.messageBuffer.messages.length,
      lastCycleTime: this.lastCycleTime,
      nextCycleTime,
      secondsUntilNextCycle,
      selectedMessage: null,
      aiResponse: null,
      error: null,
    };
  }
  
  getLogs(): DachiStreamLog[] {
    return [...this.logs];
  }
  
  getBufferMessages(): ChatMessage[] {
    return [...this.messageBuffer.messages];
  }
  
  logAIResponse(response: string) {
    this.addLog("ai_response", `AI Response generated: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`, {
      fullResponse: response,
      length: response.length
    });
    this.broadcastState();
  }
}
