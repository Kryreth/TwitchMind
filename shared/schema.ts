import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Chat Messages Table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  message: text("message").notNull(),
  channel: text("channel").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  userColor: text("user_color"),
  badges: jsonb("badges").$type<Record<string, string>>(),
  emotes: jsonb("emotes"),
});

// AI Analysis Table
export const aiAnalysis = pgTable("ai_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  sentiment: text("sentiment").notNull(), // positive, neutral, negative
  sentimentScore: integer("sentiment_score").notNull(), // 1-5
  toxicity: boolean("toxicity").notNull().default(false),
  categories: jsonb("categories").$type<string[]>(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// AI Commands Table
export const aiCommands = pgTable("ai_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trigger: text("trigger").notNull().unique(),
  prompt: text("prompt").notNull(),
  responseType: text("response_type").notNull(), // direct, analysis, generate
  enabled: boolean("enabled").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Settings Table
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  twitchChannel: text("twitch_channel"),
  twitchUsername: text("twitch_username"),
  autoModeration: boolean("auto_moderation").notNull().default(false),
  sentimentThreshold: integer("sentiment_threshold").notNull().default(2), // 1-5
  enableAiAnalysis: boolean("enable_ai_analysis").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  analysis: one(aiAnalysis, {
    fields: [chatMessages.id],
    references: [aiAnalysis.messageId],
  }),
}));

export const aiAnalysisRelations = relations(aiAnalysis, ({ one }) => ({
  message: one(chatMessages, {
    fields: [aiAnalysis.messageId],
    references: [chatMessages.id],
  }),
}));

// Insert Schemas
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertAiAnalysisSchema = createInsertSchema(aiAnalysis).omit({
  id: true,
  timestamp: true,
});

export const insertAiCommandSchema = createInsertSchema(aiCommands).omit({
  id: true,
  usageCount: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type AiAnalysis = typeof aiAnalysis.$inferSelect;
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;

export type AiCommand = typeof aiCommands.$inferSelect;
export type InsertAiCommand = z.infer<typeof insertAiCommandSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Extended types for frontend
export type ChatMessageWithAnalysis = ChatMessage & {
  analysis?: AiAnalysis;
};
