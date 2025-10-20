// Reference: javascript_database blueprint
import {
  chatMessages,
  aiAnalysis,
  aiCommands,
  settings,
  userProfiles,
  userInsights,
  authenticatedUsers,
  type ChatMessage,
  type InsertChatMessage,
  type AiAnalysis,
  type InsertAiAnalysis,
  type AiCommand,
  type InsertAiCommand,
  type Settings,
  type InsertSettings,
  type ChatMessageWithAnalysis,
  type UserProfile,
  type InsertUserProfile,
  type UserInsight,
  type InsertUserInsight,
  type UserProfileWithInsight,
  type AuthenticatedUser,
  type InsertAuthenticatedUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  getUserProfileByUsername(username: string): Promise<UserProfile | undefined>;
  getAllUserProfiles(): Promise<UserProfile[]>;
  getVipUsers(): Promise<UserProfile[]>;
  createOrUpdateUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  toggleVip(userId: string, isVip: boolean): Promise<UserProfile>;
  updateUserLastSeen(userId: string): Promise<void>;
  updateShoutoutTimestamp(userId: string): Promise<void>;
  
  // User Insights
  getUserInsight(userId: string): Promise<UserInsight | undefined>;
  saveUserInsight(insight: InsertUserInsight): Promise<UserInsight>;
  getAllUserInsights(): Promise<UserInsight[]>;
  
  // Chat Messages
  getChatMessages(limit?: number): Promise<ChatMessageWithAnalysis[]>;
  getChatMessageById(id: string): Promise<ChatMessage | undefined>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getMessagesByUser(userId: string, limit?: number): Promise<ChatMessage[]>;
  
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
  
  // Authenticated Users
  getAuthenticatedUser(): Promise<AuthenticatedUser | undefined>;
  saveAuthenticatedUser(user: InsertAuthenticatedUser): Promise<AuthenticatedUser>;
  deleteAuthenticatedUser(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User Profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async getUserProfileByUsername(username: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.username, username));
    return profile || undefined;
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    return await db.select().from(userProfiles).orderBy(desc(userProfiles.lastSeen));
  }

  async getVipUsers(): Promise<UserProfile[]> {
    return await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.isVip, true))
      .orderBy(desc(userProfiles.lastSeen));
  }

  async createOrUpdateUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const existing = await this.getUserProfile(profile.userId);
    
    if (existing) {
      const [updated] = await db
        .update(userProfiles)
        .set({ 
          ...profile, 
          lastSeen: new Date() 
        })
        .where(eq(userProfiles.userId, profile.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userProfiles)
        .values(profile)
        .returning();
      return created;
    }
  }

  async toggleVip(userId: string, isVip: boolean): Promise<UserProfile> {
    const [updated] = await db
      .update(userProfiles)
      .set({ isVip })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  async updateUserLastSeen(userId: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({ lastSeen: new Date() })
      .where(eq(userProfiles.userId, userId));
  }

  async updateShoutoutTimestamp(userId: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({ shoutoutLastGiven: new Date() })
      .where(eq(userProfiles.userId, userId));
  }

  // User Insights
  async getUserInsight(userId: string): Promise<UserInsight | undefined> {
    const [insight] = await db
      .select()
      .from(userInsights)
      .where(eq(userInsights.userId, userId));
    return insight || undefined;
  }

  async saveUserInsight(insight: InsertUserInsight): Promise<UserInsight> {
    const existing = await this.getUserInsight(insight.userId);
    
    if (existing) {
      const [updated] = await db
        .update(userInsights)
        .set({ 
          userId: insight.userId,
          summary: insight.summary,
          totalMessages: insight.totalMessages,
          recentTags: insight.recentTags as string[] | undefined,
          lastUpdated: new Date() 
        })
        .where(eq(userInsights.userId, insight.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userInsights)
        .values({
          userId: insight.userId,
          summary: insight.summary,
          totalMessages: insight.totalMessages,
          recentTags: insight.recentTags as string[] | undefined,
        })
        .returning();
      return created;
    }
  }

  async getAllUserInsights(): Promise<UserInsight[]> {
    return await db.select().from(userInsights);
  }

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

  async getMessagesByUser(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);
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
      .values({
        messageId: insertAnalysis.messageId,
        sentiment: insertAnalysis.sentiment,
        sentimentScore: insertAnalysis.sentimentScore,
        toxicity: insertAnalysis.toxicity,
        categories: insertAnalysis.categories as string[] | undefined,
      })
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
      .values({
        ...insertSettings,
        topicAllowlist: insertSettings.topicAllowlist as string[] | undefined,
        topicBlocklist: insertSettings.topicBlocklist as string[] | undefined,
      })
      .returning();
    return setting;
  }

  async updateSettings(id: string, updateData: Partial<InsertSettings>): Promise<Settings> {
    const [setting] = await db
      .update(settings)
      .set({ 
        ...updateData, 
        topicAllowlist: updateData.topicAllowlist as string[] | undefined,
        topicBlocklist: updateData.topicBlocklist as string[] | undefined,
        updatedAt: new Date() 
      })
      .where(eq(settings.id, id))
      .returning();
    return setting;
  }

  // Authenticated Users
  async getAuthenticatedUser(): Promise<AuthenticatedUser | undefined> {
    const [user] = await db
      .select()
      .from(authenticatedUsers)
      .limit(1);
    return user || undefined;
  }

  async saveAuthenticatedUser(insertUser: InsertAuthenticatedUser): Promise<AuthenticatedUser> {
    const existing = await this.getAuthenticatedUser();
    
    if (existing) {
      const [updated] = await db
        .update(authenticatedUsers)
        .set({ 
          ...insertUser, 
          updatedAt: new Date() 
        })
        .where(eq(authenticatedUsers.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(authenticatedUsers)
        .values(insertUser)
        .returning();
      return created;
    }
  }

  async deleteAuthenticatedUser(): Promise<void> {
    await db.delete(authenticatedUsers);
  }
}

export const storage = new DatabaseStorage();
