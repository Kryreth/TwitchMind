// Reference: javascript_websocket blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertChatMessageSchema,
  insertAiAnalysisSchema,
  insertAiCommandSchema,
  insertSettingsSchema,
  insertUserProfileSchema,
  insertUserInsightSchema,
} from "@shared/schema";
import { connectToTwitch, disconnectFromTwitch, addWebSocketClient, getTwitchClient } from "./twitch-client";
import { twitchOAuthService } from "./twitch-oauth-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat Messages
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(100);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const data = insertChatMessageSchema.parse(req.body);
      const message = await storage.createChatMessage(data);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // AI Analyses
  app.get("/api/analyses", async (req, res) => {
    try {
      const analyses = await storage.getAiAnalyses();
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });

  app.post("/api/analyses", async (req, res) => {
    try {
      const data = insertAiAnalysisSchema.parse(req.body);
      const analysis = await storage.createAiAnalysis(data);
      res.json(analysis);
    } catch (error) {
      console.error("Error creating analysis:", error);
      res.status(400).json({ error: "Invalid analysis data" });
    }
  });

  // AI Commands
  app.get("/api/commands", async (req, res) => {
    try {
      const commands = await storage.getAiCommands();
      res.json(commands);
    } catch (error) {
      console.error("Error fetching commands:", error);
      res.status(500).json({ error: "Failed to fetch commands" });
    }
  });

  app.post("/api/commands", async (req, res) => {
    try {
      const data = insertAiCommandSchema.parse(req.body);
      const command = await storage.createAiCommand(data);
      res.json(command);
    } catch (error) {
      console.error("Error creating command:", error);
      res.status(400).json({ error: "Invalid command data" });
    }
  });

  app.patch("/api/commands/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const command = await storage.updateAiCommand(id, req.body);
      res.json(command);
    } catch (error) {
      console.error("Error updating command:", error);
      res.status(400).json({ error: "Failed to update command" });
    }
  });

  app.delete("/api/commands/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAiCommand(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting command:", error);
      res.status(400).json({ error: "Failed to delete command" });
    }
  });

  // User Profiles
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUserProfiles();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/vips", async (req, res) => {
    try {
      const vips = await storage.getVipUsers();
      res.json(vips);
    } catch (error) {
      console.error("Error fetching VIPs:", error);
      res.status(500).json({ error: "Failed to fetch VIPs" });
    }
  });

  app.get("/api/users/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUserProfile(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserProfileSchema.parse(req.body);
      const user = await storage.createOrUpdateUserProfile(data);
      res.json(user);
    } catch (error) {
      console.error("Error creating/updating user:", error);
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.patch("/api/users/:userId/vip", async (req, res) => {
    try {
      const { userId } = req.params;
      const { isVip } = req.body;
      const user = await storage.toggleVip(userId, isVip);
      res.json(user);
    } catch (error) {
      console.error("Error toggling VIP status:", error);
      res.status(400).json({ error: "Failed to update VIP status" });
    }
  });

  // Active Chatters
  app.get("/api/chatters/active", async (req, res) => {
    try {
      const { getTwitchClient, activeChattersService } = await import("./twitch-client");
      const chatters = activeChattersService.getActiveChatters();
      res.json(chatters);
    } catch (error) {
      console.error("Error fetching active chatters:", error);
      res.status(500).json({ error: "Failed to fetch active chatters" });
    }
  });

  app.get("/api/chatters/search", async (req, res) => {
    try {
      const { activeChattersService } = await import("./twitch-client");
      const query = req.query.q as string || "";
      const results = activeChattersService.searchChatters(query);
      res.json(results);
    } catch (error) {
      console.error("Error searching chatters:", error);
      res.status(500).json({ error: "Failed to search chatters" });
    }
  });

  // User Insights
  app.get("/api/insights", async (req, res) => {
    try {
      const insights = await storage.getAllUserInsights();
      res.json(insights);
    } catch (error) {
      console.error("Error fetching insights:", error);
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  });

  app.get("/api/insights/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const insight = await storage.getUserInsight(userId);
      if (!insight) {
        return res.status(404).json({ error: "Insight not found" });
      }
      res.json(insight);
    } catch (error) {
      console.error("Error fetching insight:", error);
      res.status(500).json({ error: "Failed to fetch insight" });
    }
  });

  app.post("/api/insights", async (req, res) => {
    try {
      const data = insertUserInsightSchema.parse(req.body);
      const insight = await storage.saveUserInsight(data);
      res.json(insight);
    } catch (error) {
      console.error("Error saving insight:", error);
      res.status(400).json({ error: "Invalid insight data" });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const data = insertSettingsSchema.parse(req.body);
      const setting = await storage.createSettings(data);
      
      if (data.twitchChannel && data.twitchUsername) {
        await connectToTwitch(data.twitchChannel, data.twitchUsername);
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error creating settings:", error);
      res.status(400).json({ error: "Invalid settings data" });
    }
  });

  app.patch("/api/settings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const setting = await storage.updateSettings(id, req.body);
      
      // Try to reconnect to Twitch, but don't fail the settings save if it errors
      if (req.body.twitchChannel && req.body.twitchUsername) {
        try {
          await connectToTwitch(req.body.twitchChannel, req.body.twitchUsername);
        } catch (twitchError) {
          console.error("Warning: Twitch reconnection failed, but settings saved:", twitchError);
        }
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(400).json({ error: "Failed to update settings" });
    }
  });

  // Twitch OAuth Routes
  app.get("/api/auth/twitch", (req, res) => {
    try {
      const authUrl = twitchOAuthService.getAuthorizationUrl();
      console.log("=== TWITCH OAUTH DEBUG ===");
      console.log("Generated Auth URL:", authUrl);
      console.log("REPLIT_DEV_DOMAIN:", process.env.REPLIT_DEV_DOMAIN);
      console.log("Expected callback:", process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/twitch/callback`
        : 'http://localhost:5000/api/auth/twitch/callback');
      console.log("========================");
      res.redirect(authUrl);
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({ error: "Failed to generate authorization URL" });
    }
  });

  app.get("/api/auth/twitch/callback", async (req, res) => {
    console.log("=== OAUTH CALLBACK HIT ===");
    console.log("Query params:", req.query);
    console.log("========================");
    
    try {
      const { code, error } = req.query;
      
      if (error) {
        console.error("OAuth error from Twitch:", error);
        return res.redirect(`/?auth=error&reason=${error}`);
      }
      
      if (!code || typeof code !== 'string') {
        console.error("No authorization code received");
        return res.status(400).json({ error: "Authorization code is required" });
      }

      // Exchange code for token
      const tokenResponse = await twitchOAuthService.exchangeCodeForToken(code);
      
      // Get user info
      const twitchUser = await twitchOAuthService.getTwitchUser(tokenResponse.access_token);
      
      // Calculate token expiration
      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
      
      // Save authenticated user
      await storage.saveAuthenticatedUser({
        twitchUserId: twitchUser.id,
        twitchUsername: twitchUser.login,
        twitchDisplayName: twitchUser.display_name,
        twitchProfileImageUrl: twitchUser.profile_image_url,
        twitchEmail: twitchUser.email,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiresAt: expiresAt,
      });

      // Auto-connect to Twitch with OAuth token
      try {
        await connectToTwitch(twitchUser.login, twitchUser.login);
        console.log(`Auto-connected to Twitch channel: ${twitchUser.login}`);
      } catch (error) {
        console.error("Failed to auto-connect after OAuth:", error);
      }

      // Redirect to dashboard
      res.redirect("/?auth=success");
    } catch (error) {
      console.error("Error in OAuth callback:", error);
      res.redirect("/?auth=error");
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      await storage.deleteAuthenticatedUser();
      disconnectFromTwitch();
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      const user = await storage.getAuthenticatedUser();
      if (!user) {
        return res.status(404).json({ error: "No authenticated user" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching authenticated user:", error);
      res.status(500).json({ error: "Failed to fetch authenticated user" });
    }
  });

  // Twitch Connection Control
  app.post("/api/twitch/connect", async (req, res) => {
    try {
      const { channel, username } = req.body;
      if (!channel) {
        return res.status(400).json({ error: "Channel name is required" });
      }
      await connectToTwitch(channel, username);
      res.json({ success: true, message: "Connected to Twitch" });
    } catch (error) {
      console.error("Error connecting to Twitch:", error);
      res.status(500).json({ error: "Failed to connect to Twitch" });
    }
  });

  app.post("/api/twitch/disconnect", async (req, res) => {
    try {
      disconnectFromTwitch();
      res.json({ success: true, message: "Disconnected from Twitch" });
    } catch (error) {
      console.error("Error disconnecting from Twitch:", error);
      res.status(500).json({ error: "Failed to disconnect from Twitch" });
    }
  });

  app.get("/api/twitch/status", async (req, res) => {
    try {
      const client = getTwitchClient();
      const messageCount = await storage.getChatMessages(1);
      
      if (!client) {
        return res.json({
          connected: false,
          channel: null,
          messageCount: messageCount.length,
        });
      }

      const channels = client.getChannels();
      res.json({
        connected: client.readyState() === "OPEN",
        channel: channels.length > 0 ? channels[0].replace('#', '') : null,
        messageCount: messageCount.length,
      });
    } catch (error) {
      console.error("Error getting Twitch status:", error);
      res.status(500).json({ error: "Failed to get Twitch status" });
    }
  });

  // DachiStream Controls - imported from index.ts where service is initialized
  app.post("/api/dachistream/pause", async (req, res) => {
    try {
      // This will be handled by the DachiStream service instance in index.ts
      res.json({ success: true, message: "DachiStream paused" });
    } catch (error) {
      console.error("Error pausing DachiStream:", error);
      res.status(500).json({ error: "Failed to pause DachiStream" });
    }
  });

  app.post("/api/dachistream/resume", async (req, res) => {
    try {
      // This will be handled by the DachiStream service instance in index.ts
      res.json({ success: true, message: "DachiStream resumed" });
    } catch (error) {
      console.error("Error resuming DachiStream:", error);
      res.status(500).json({ error: "Failed to resume DachiStream" });
    }
  });

  app.get("/api/dachistream/status", async (req, res) => {
    try {
      // This will be handled by the DachiStream service instance in index.ts
      res.json({
        messageCount: 0,
        userCount: 0,
        isPaused: false,
      });
    } catch (error) {
      console.error("Error getting DachiStream status:", error);
      res.status(500).json({ error: "Failed to get DachiStream status" });
    }
  });

  // ElevenLabs TTS - imported from index.ts where service is initialized
  app.post("/api/tts/generate", async (req, res) => {
    try {
      const { text, voiceId } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      // This will be handled by the ElevenLabs service instance in index.ts
      res.json({
        success: true,
        message: "TTS generation endpoint ready",
      });
    } catch (error) {
      console.error("Error generating TTS:", error);
      res.status(500).json({ error: "Failed to generate TTS" });
    }
  });

  // ElevenLabs usage endpoint (alias for frontend convenience)
  app.get("/api/elevenlabs/usage", async (req, res) => {
    try {
      const elevenLabsService = (req.app as any).elevenLabsService;
      if (!elevenLabsService) {
        return res.json({
          characterCount: 0,
          characterLimit: 10000,
          quotaRemaining: 10000,
        });
      }
      const usage = await elevenLabsService.getUsage();
      // Transform the service response to match frontend expectations
      res.json({
        characterCount: usage.characterCount || 0,
        characterLimit: usage.characterLimit || 10000,
        quotaRemaining: (usage.characterLimit || 10000) - (usage.characterCount || 0),
      });
    } catch (error) {
      console.error("Error fetching ElevenLabs usage:", error);
      res.status(500).json({ error: "Failed to fetch usage" });
    }
  });

  app.get("/api/tts/usage", async (req, res) => {
    try {
      // This will be handled by the ElevenLabs service instance in index.ts
      res.json({
        characterCount: 0,
        characterLimit: 0,
        percentUsed: 0,
        warningTriggered: false,
      });
    } catch (error) {
      console.error("Error fetching TTS usage:", error);
      res.status(500).json({ error: "Failed to fetch TTS usage" });
    }
  });

  // Speech-to-Text for Streamer Voice
  app.post("/api/stt/transcribe", async (req, res) => {
    try {
      // This endpoint will handle audio transcription using OpenAI Whisper
      // Implementation will be added when integrating services
      res.json({
        success: true,
        message: "STT transcription endpoint ready",
      });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  app.post("/api/stt/cleanup", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      // This will use the cleanupSpeechText function from openai-service
      res.json({
        original: text,
        cleaned: text,
      });
    } catch (error) {
      console.error("Error cleaning up speech:", error);
      res.status(500).json({ error: "Failed to clean up speech" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket Server - using distinct path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");
    addWebSocketClient(ws);

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("Received WebSocket message:", data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  // Auto-connect to Twitch if authenticated user exists (OAuth takes priority)
  const authenticatedUser = await storage.getAuthenticatedUser();
  if (authenticatedUser && authenticatedUser.twitchUsername) {
    try {
      await connectToTwitch(authenticatedUser.twitchUsername, authenticatedUser.twitchUsername);
      console.log(`Auto-connected to Twitch via OAuth: ${authenticatedUser.twitchUsername}`);
    } catch (error) {
      console.error("Failed to auto-connect to Twitch:", error);
    }
  } else {
    // Fallback to manual settings if no OAuth user
    const existingSettings = await storage.getSettings();
    if (existingSettings.length > 0) {
      const setting = existingSettings[0];
      const channel = setting.twitchChannel;
      if (channel) {
        try {
          await connectToTwitch(channel, setting.twitchUsername ?? undefined);
          console.log(`Auto-connected to Twitch channel: ${channel}`);
        } catch (error) {
          console.error("Failed to auto-connect to Twitch:", error);
        }
      }
    }
  }

  // DachiStream Monitor API
  app.get("/api/dachistream/status", (req, res) => {
    try {
      const dachiStreamService = (req.app as any).dachiStreamService;
      if (!dachiStreamService) {
        return res.status(503).json({ error: "DachiStream service not available" });
      }
      
      const state = dachiStreamService.getState();
      res.json(state);
    } catch (error) {
      console.error("Error fetching DachiStream status:", error);
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  app.get("/api/dachistream/logs", (req, res) => {
    try {
      const dachiStreamService = (req.app as any).dachiStreamService;
      if (!dachiStreamService) {
        return res.status(503).json({ error: "DachiStream service not available" });
      }
      
      const logs = dachiStreamService.getLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching DachiStream logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.get("/api/dachistream/buffer", (req, res) => {
    try {
      const dachiStreamService = (req.app as any).dachiStreamService;
      if (!dachiStreamService) {
        return res.status(503).json({ error: "DachiStream service not available" });
      }
      
      const messages = dachiStreamService.getBufferMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching DachiStream buffer:", error);
      res.status(500).json({ error: "Failed to fetch buffer" });
    }
  });

  return httpServer;
}
