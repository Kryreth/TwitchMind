// Reference: javascript_database blueprint
import {
  chatMessages,
  aiAnalysis,
  aiCommands,
  settings,
  type ChatMessage,
  type InsertChatMessage,
  type AiAnalysis,
  type InsertAiAnalysis,
  type AiCommand,
  type InsertAiCommand,
  type Settings,
  type InsertSettings,
  type ChatMessageWithAnalysis,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Chat Messages
  getChatMessages(limit?: number): Promise<ChatMessageWithAnalysis[]>;
  getChatMessageById(id: string): Promise<ChatMessage | undefined>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // AI Analysis
  getAiAnalyses(): Promise<AiAnalysis[]>;
  getAiAnalysisByMessageId(messageId: string): Promise<AiAnalysis | undefined>;
  createAiAnalysis(analysis: InsertAiAnalysis): Promise<AiAnalysis>;
  
  // AI Commands
  getAiCommands(): Promise<AiCommand[]>;
  getAiCommandByTrigger(trigger: string): Promise<AiCommand | undefined>;
  createAiCommand(command: InsertAiCommand): Promise<AiCommand>;
  updateAiCommand(id: string, data: Partial<InsertAiCommand>): Promise<AiCommand>;
  deleteAiCommand(id: string): Promise<void>;
  incrementCommandUsage(id: string): Promise<void>;
  
  // Settings
  getSettings(): Promise<Settings[]>;
  getSettingsById(id: string): Promise<Settings | undefined>;
  createSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(id: string, settings: Partial<InsertSettings>): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  // Chat Messages
  async getChatMessages(limit: number = 100): Promise<ChatMessageWithAnalysis[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);
    
    const messagesWithAnalysis: ChatMessageWithAnalysis[] = [];
    for (const message of messages) {
      const analysis = await this.getAiAnalysisByMessageId(message.id);
      messagesWithAnalysis.push({
        ...message,
        analysis,
      });
    }
    
    return messagesWithAnalysis.reverse();
  }

  async getChatMessageById(id: string): Promise<ChatMessage | undefined> {
    const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
    return message || undefined;
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  // AI Analysis
  async getAiAnalyses(): Promise<AiAnalysis[]> {
    return await db.select().from(aiAnalysis).orderBy(desc(aiAnalysis.timestamp));
  }

  async getAiAnalysisByMessageId(messageId: string): Promise<AiAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(aiAnalysis)
      .where(eq(aiAnalysis.messageId, messageId));
    return analysis || undefined;
  }

  async createAiAnalysis(insertAnalysis: InsertAiAnalysis): Promise<AiAnalysis> {
    const [analysis] = await db
      .insert(aiAnalysis)
      .values(insertAnalysis)
      .returning();
    return analysis;
  }

  // AI Commands
  async getAiCommands(): Promise<AiCommand[]> {
    return await db.select().from(aiCommands).orderBy(desc(aiCommands.createdAt));
  }

  async getAiCommandByTrigger(trigger: string): Promise<AiCommand | undefined> {
    const [command] = await db
      .select()
      .from(aiCommands)
      .where(eq(aiCommands.trigger, trigger));
    return command || undefined;
  }

  async createAiCommand(insertCommand: InsertAiCommand): Promise<AiCommand> {
    const [command] = await db
      .insert(aiCommands)
      .values(insertCommand)
      .returning();
    return command;
  }

  async updateAiCommand(id: string, data: Partial<InsertAiCommand>): Promise<AiCommand> {
    const [command] = await db
      .update(aiCommands)
      .set(data)
      .where(eq(aiCommands.id, id))
      .returning();
    return command;
  }

  async deleteAiCommand(id: string): Promise<void> {
    await db.delete(aiCommands).where(eq(aiCommands.id, id));
  }

  async incrementCommandUsage(id: string): Promise<void> {
    const [command] = await db
      .select()
      .from(aiCommands)
      .where(eq(aiCommands.id, id));
    
    if (command) {
      await db
        .update(aiCommands)
        .set({ usageCount: command.usageCount + 1 })
        .where(eq(aiCommands.id, id));
    }
  }

  // Settings
  async getSettings(): Promise<Settings[]> {
    return await db.select().from(settings);
  }

  async getSettingsById(id: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.id, id));
    return setting || undefined;
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const [setting] = await db
      .insert(settings)
      .values(insertSettings)
      .returning();
    return setting;
  }

  async updateSettings(id: string, updateData: Partial<InsertSettings>): Promise<Settings> {
    const [setting] = await db
      .update(settings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(settings.id, id))
      .returning();
    return setting;
  }
}

export const storage = new DatabaseStorage();
