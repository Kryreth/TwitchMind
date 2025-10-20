import type { IStorage } from "./storage";
import type { ChatMessage, UserInsight, Settings } from "@shared/schema";

export interface MessageBuffer {
  messages: ChatMessage[];
  userMessageCounts: Map<string, number>;
}

export type SelectionStrategy = "most_active" | "random" | "new_chatter";

export class DachiStreamService {
  private storage: IStorage;
  private messageBuffer: MessageBuffer = {
    messages: [],
    userMessageCounts: new Map(),
  };
  private intervalId: NodeJS.Timeout | null = null;
  private isPaused: boolean = false;
  private onMessageSelected?: (message: ChatMessage, context: string) => Promise<void>;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  start(onMessageSelected: (message: ChatMessage, context: string) => Promise<void>) {
    this.onMessageSelected = onMessageSelected;
    
    // Run every 15 seconds
    this.intervalId = setInterval(() => {
      this.processBuffer();
    }, 15000);
    
    console.log("DachiStream service started (15-second cycle)");
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("DachiStream service stopped");
  }

  pause() {
    this.isPaused = true;
    console.log("DachiStream paused");
  }

  resume() {
    this.isPaused = false;
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
  }

  private async processBuffer() {
    // Skip if paused or no messages
    if (this.isPaused || this.messageBuffer.messages.length === 0) {
      return;
    }

    try {
      // Get current settings (returns array, take first)
      const allSettings = await this.storage.getSettings();
      const settings = allSettings[0];
      
      if (!settings || !settings.dachipoolEnabled) {
        this.clearBuffer();
        return;
      }

      // Select message based on strategy
      const selectedMessage = await this.selectMessage(
        settings.dachiastreamSelectionStrategy as SelectionStrategy
      );

      if (selectedMessage) {
        // Build AI context
        const context = await this.buildAIContext(selectedMessage, settings);

        // Trigger AI response callback
        if (this.onMessageSelected) {
          await this.onMessageSelected(selectedMessage, context);
        }
      }
    } catch (error) {
      console.error("Error processing DachiStream buffer:", error);
    } finally {
      // Clear buffer for next cycle
      this.clearBuffer();
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
}
