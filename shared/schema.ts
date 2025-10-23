import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User Profiles Table - Track VIP/Mod/Subscriber status
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().unique(), // Twitch user ID
  username: text("username").notNull(),
  isVip: boolean("is_vip").notNull().default(false),
  isMod: boolean("is_mod").notNull().default(false),
  isSubscriber: boolean("is_subscriber").notNull().default(false),
  channelPointsBalance: integer("channel_points_balance").default(0),
  wasAnonymous: boolean("was_anonymous").notNull().default(false),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  shoutoutLastGiven: timestamp("shoutout_last_given"),
});

// User Insights Table - AI Learning Engine
export const userInsights = pgTable("user_insights", {
  userId: text("user_id").primaryKey(), // References userProfiles.userId
  summary: text("summary"), // AI-generated personality summary
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  totalMessages: integer("total_messages").notNull().default(0),
  recentTags: jsonb("recent_tags").$type<string[]>().default(sql`'[]'::jsonb`),
});

// Chat Messages Table - Enhanced with stream tracking
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id"), // Twitch user ID (may be null for anonymous)
  username: text("username").notNull(),
  message: text("message").notNull(),
  channel: text("channel").notNull(),
  streamId: text("stream_id"), // Unique per streaming session
  eventType: text("event_type").notNull().default("chat"), // chat, redeem, raid, sub, etc.
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  userColor: text("user_color"),
  badges: jsonb("badges").$type<Record<string, string>>(),
  emotes: jsonb("emotes"),
  metadata: jsonb("metadata"), // Additional event-specific data
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

// Streamer Speaks Table - History of polished streamer messages
export const streamerSpeaks = pgTable("streamer_speaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalText: text("original_text").notNull(), // Raw transcription
  polishedText: text("polished_text").notNull(), // GPT-cleaned version
  wasSpoken: boolean("was_spoken").notNull().default(false), // Was it sent to TTS
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Authenticated Users Table - OAuth Login
export const authenticatedUsers = pgTable("authenticated_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  twitchUserId: text("twitch_user_id").notNull().unique(),
  twitchUsername: text("twitch_username").notNull(),
  twitchDisplayName: text("twitch_display_name").notNull(),
  twitchProfileImageUrl: text("twitch_profile_image_url"),
  twitchEmail: text("twitch_email"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Raids Table - Track incoming raids
export const raids = pgTable("raids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: text("from_user_id").notNull(), // Raider's Twitch user ID
  fromUsername: text("from_username").notNull(), // Raider's username
  fromDisplayName: text("from_display_name").notNull(), // Raider's display name
  viewers: integer("viewers").notNull().default(0), // Number of viewers in raid
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Settings Table - Enhanced with DachiPool configuration
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  twitchChannel: text("twitch_channel"),
  twitchUsername: text("twitch_username"),
  autoModeration: boolean("auto_moderation").notNull().default(false),
  sentimentThreshold: integer("sentiment_threshold").notNull().default(2), // 1-5
  enableAiAnalysis: boolean("enable_ai_analysis").notNull().default(true),
  
  // Browser Source Settings
  browserSourceEnabled: boolean("browser_source_enabled").notNull().default(false),
  browserSourceToken: text("browser_source_token"), // Unique token for OBS URL
  
  // DachiPool Settings
  dachipoolEnabled: boolean("dachipool_enabled").notNull().default(true),
  dachipoolMaxChars: integer("dachipool_max_chars").notNull().default(1000),
  dachipoolEnergy: text("dachipool_energy").notNull().default("Balanced"), // Balanced, High, Low
  dachipoolMode: text("dachipool_mode").notNull().default("Auto"), // Auto, Manual
  dachipoolShoutoutCooldownHours: integer("dachipool_shoutout_cooldown_hours").notNull().default(24),
  dachipoolOpenaiModel: text("dachipool_openai_model").notNull().default("llama-3.3-70b-versatile"),
  dachipoolOpenaiTemp: integer("dachipool_openai_temp").notNull().default(7), // Stored as 0-10, divide by 10
  aiPersonality: text("ai_personality").notNull().default("Casual"), // Casual, Comedy, Quirky, Serious, Gaming, Professional
  dachipoolElevenlabsEnabled: boolean("dachipool_elevenlabs_enabled").notNull().default(false),
  dachipoolElevenlabsVoice: text("dachipool_elevenlabs_voice").default("Default"),
  autoShoutoutsEnabled: boolean("auto_shoutouts_enabled").notNull().default(true),
  
  // Audio Settings
  audioMicMode: text("audio_mic_mode").notNull().default("muted"), // muted, passthrough
  audioVoiceSelection: text("audio_voice_selection").default("Default"),
  audioAiVoiceActive: boolean("audio_ai_voice_active").notNull().default(true),
  audioSpeechCleanup: boolean("audio_speech_cleanup").notNull().default(true),
  audioFallbackToTextOnly: boolean("audio_fallback_to_text_only").notNull().default(true),
  audioCooldownBetweenReplies: integer("audio_cooldown_between_replies").notNull().default(5), // seconds
  audioMaxVoiceLength: integer("audio_max_voice_length").notNull().default(500), // characters
  
  // Topic Filters
  topicAllowlist: jsonb("topic_allowlist").$type<string[]>().default(sql`'["gaming", "anime", "chatting"]'::jsonb`),
  topicBlocklist: jsonb("topic_blocklist").$type<string[]>().default(sql`'["politics", "religion"]'::jsonb`),
  useDatabasePersonalization: boolean("use_database_personalization").notNull().default(true),
  streamerVoiceOnlyMode: boolean("streamer_voice_only_mode").notNull().default(false),
  
  // DachiStream Settings
  dachiastreamSelectionStrategy: text("dachiastream_selection_strategy").notNull().default("most_active"), // most_active, random, new_chatter
  dachiastreamPaused: boolean("dachiastream_paused").notNull().default(false),
  dachiastreamAutoSendToChat: boolean("dachiastream_auto_send_to_chat").notNull().default(false),
  dachiastreamCycleInterval: integer("dachiastream_cycle_interval").notNull().default(15), // seconds between cycles (5-60)
  
  // ElevenLabs Usage Tracking
  elevenlabsVoiceId: text("elevenlabs_voice_id"),
  elevenlabsUsageQuota: integer("elevenlabs_usage_quota").default(0),
  elevenlabsUsageUsed: integer("elevenlabs_usage_used").default(0),
  elevenlabsUsageLastChecked: timestamp("elevenlabs_usage_last_checked"),
  
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
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  firstSeen: true,
  lastSeen: true,
});

export const insertUserInsightSchema = createInsertSchema(userInsights).omit({
  lastUpdated: true,
});

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

export const insertStreamerSpeaksSchema = createInsertSchema(streamerSpeaks).omit({
  id: true,
  timestamp: true,
});

export const insertAuthenticatedUserSchema = createInsertSchema(authenticatedUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRaidSchema = createInsertSchema(raids).omit({
  id: true,
  timestamp: true,
});

// Types
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type UserInsight = typeof userInsights.$inferSelect;
export type InsertUserInsight = z.infer<typeof insertUserInsightSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type AiAnalysis = typeof aiAnalysis.$inferSelect;
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;

export type AiCommand = typeof aiCommands.$inferSelect;
export type InsertAiCommand = z.infer<typeof insertAiCommandSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type StreamerSpeaks = typeof streamerSpeaks.$inferSelect;
export type InsertStreamerSpeaks = z.infer<typeof insertStreamerSpeaksSchema>;

export type AuthenticatedUser = typeof authenticatedUsers.$inferSelect;
export type InsertAuthenticatedUser = z.infer<typeof insertAuthenticatedUserSchema>;

export type Raid = typeof raids.$inferSelect;
export type InsertRaid = z.infer<typeof insertRaidSchema>;

// Extended types for frontend
export type ChatMessageWithAnalysis = ChatMessage & {
  analysis?: AiAnalysis;
};

export type UserProfileWithInsight = UserProfile & {
  insight?: UserInsight;
};
