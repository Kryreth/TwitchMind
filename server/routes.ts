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

  app.get("/api/users/vips/streams", async (req, res) => {
    try {
      const vips = await storage.getVipUsers();
      const vipUserIds = vips.map(vip => vip.userId);
      
      if (vipUserIds.length === 0) {
        return res.json([]);
      }

      const streams = await twitchOAuthService.getStreams(vipUserIds);
      
      res.json(streams);
    } catch (error) {
      console.error("Error fetching VIP streams:", error);
      res.status(500).json({ error: "Failed to fetch VIP streams" });
    }
  });

  app.get("/api/users/vips/enhanced", async (req, res) => {
    try {
      const vips = await storage.getVipUsers();
      
      if (vips.length === 0) {
        return res.json([]);
      }

      // Fetch enhanced info for all VIPs in parallel
      const enhancedVips = await Promise.all(
        vips.map(async (vip) => {
          const enhancedInfo = await twitchOAuthService.getEnhancedUserInfo(vip.username);
          return {
            ...vip,
            profileImageUrl: enhancedInfo.profileImageUrl,
            followerCount: enhancedInfo.followerCount,
            isLive: enhancedInfo.isLive,
            viewerCount: enhancedInfo.viewerCount,
            game: enhancedInfo.game,
          };
        })
      );

      res.json(enhancedVips);
    } catch (error) {
      console.error("Error fetching enhanced VIP data:", error);
      res.status(500).json({ error: "Failed to fetch enhanced VIP data" });
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
      
      // Update DachiStream cycle interval if it changed
      if (req.body.dachiastreamCycleInterval !== undefined && (app as any).dachiStreamService) {
        const dachiStreamService = (app as any).dachiStreamService;
        dachiStreamService.updateCycleInterval(req.body.dachiastreamCycleInterval);
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

  app.get("/api/twitch/search-users", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      if (query.length < 2) {
        return res.json([]);
      }

      const users = await twitchOAuthService.searchUsers(query);
      res.json(users);
    } catch (error) {
      console.error("Error searching Twitch users:", error);
      res.status(500).json({ error: "Failed to search Twitch users" });
    }
  });

  // Get user's latest clip for test shoutout
  app.get("/api/twitch/user-clip", async (req, res) => {
    try {
      const { username } = req.query;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: "Username parameter is required" });
      }

      const clip = await twitchOAuthService.getLatestClip(username);
      res.json({ clip });
    } catch (error) {
      console.error("Error fetching user clip:", error);
      res.status(500).json({ error: "Failed to fetch user clip" });
    }
  });

  // Raid Management
  app.get("/api/raids", async (req, res) => {
    try {
      const raids = await storage.getRaids(50);
      res.json(raids);
    } catch (error) {
      console.error("Error fetching raids:", error);
      res.status(500).json({ error: "Failed to fetch raids" });
    }
  });

  app.post("/api/raids/start", async (req, res) => {
    try {
      const { toUsername } = req.body;
      
      if (!toUsername) {
        return res.status(400).json({ error: "Target username is required" });
      }

      // Get authenticated user
      const user = await storage.getAuthenticatedUser();
      if (!user) {
        return res.status(401).json({ error: "Not authenticated. Please connect with Twitch in Settings." });
      }

      // Get target user info
      const targetUser = await twitchOAuthService.getUserByUsername(toUsername);
      if (!targetUser) {
        return res.status(404).json({ error: "Target user not found" });
      }

      // Start the raid
      const success = await twitchOAuthService.startRaid(
        user.twitchUserId,
        targetUser.id,
        user.accessToken
      );

      if (success) {
        res.json({ success: true, message: `Raid started to ${toUsername}` });
      } else {
        res.status(500).json({ error: "Failed to start raid. Please try reconnecting your Twitch account in Settings to grant raid permissions." });
      }
    } catch (error: any) {
      console.error("Error starting raid:", error);
      
      // Check if it's a scope error
      if (error.status === 401 || (error.message && error.message.includes('scope'))) {
        return res.status(403).json({ 
          error: "Missing permissions. Please reconnect your Twitch account in Settings to grant raid permissions.",
          needsReauth: true
        });
      }
      
      res.status(500).json({ error: "Failed to start raid. Please try again." });
    }
  });

  // Browser Source
  app.post("/api/browser-source/generate", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (settings.length === 0) {
        return res.status(404).json({ error: "Settings not found" });
      }

      const token = await storage.generateBrowserSourceToken(settings[0].id);
      const domain = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      const protocol = process.env.REPLIT_DEV_DOMAIN ? 'https' : 'http';
      const url = `${protocol}://${domain}/browser-source/${token}`;

      res.json({ token, url });
    } catch (error) {
      console.error("Error generating browser source token:", error);
      res.status(500).json({ error: "Failed to generate browser source token" });
    }
  });

  app.post("/api/browser-source/toggle", async (req, res) => {
    try {
      const { enabled } = req.body;
      const settings = await storage.getSettings();
      
      if (settings.length === 0) {
        return res.status(404).json({ error: "Settings not found" });
      }

      const updated = await storage.updateSettings(settings[0].id, {
        browserSourceEnabled: enabled,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error toggling browser source:", error);
      res.status(500).json({ error: "Failed to toggle browser source" });
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

  // Browser Source HTML Page for OBS
  app.get("/browser-source/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Verify token
      const settings = await storage.getBrowserSourceSettings(token);
      if (!settings || !settings.browserSourceEnabled) {
        return res.status(404).send("Browser source not found or disabled");
      }

      const domain = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      const wsProtocol = process.env.REPLIT_DEV_DOMAIN ? 'wss' : 'ws';
      
      // Serve HTML page with WebSocket connection for live shoutouts
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StreamDachi VIP Shoutouts</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      background: transparent;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden;
    }
    
    #shoutout-container {
      position: fixed;
      bottom: 20px;
      left: 20px;
      max-width: 600px;
      opacity: 0;
      transform: translateY(100px);
      transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    
    #shoutout-container.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .shoutout {
      background: linear-gradient(135deg, #6441a5 0%, #9146ff 100%);
      padding: 20px 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(148, 70, 255, 0.5);
      color: white;
      font-size: 24px;
      font-weight: 600;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      border: 3px solid rgba(255, 255, 255, 0.3);
    }
    
    .vip-icon {
      display: inline-block;
      margin-right: 10px;
      font-size: 28px;
      animation: bounce 1s infinite;
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
  </style>
</head>
<body>
  <div id="shoutout-container">
    <div class="shoutout">
      <span class="vip-icon">🎉</span>
      <span id="shoutout-text"></span>
      <span class="vip-icon">💜</span>
    </div>
  </div>

  <script>
    const ws = new WebSocket('${wsProtocol}://${domain}/ws');
    const container = document.getElementById('shoutout-container');
    const text = document.getElementById('shoutout-text');
    let hideTimeout;
    
    ws.onopen = () => {
      console.log('Connected to StreamDachi');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Listen for auto_shoutout events
        if (data.event === 'auto_shoutout') {
          showShoutout(data.data.username);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
    
    function showShoutout(username) {
      // Clear any existing timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
      
      // Update text and show
      text.textContent = \`Welcome VIP @\${username}! Thanks for being amazing!\`;
      container.classList.add('show');
      
      // Hide after 5 seconds
      hideTimeout = setTimeout(() => {
        container.classList.remove('show');
      }, 5000);
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('Disconnected from StreamDachi');
      // Attempt reconnection after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    };
  </script>
</body>
</html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error("Error serving browser source:", error);
      res.status(500).send("Internal server error");
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

  // Voice Enhancement API - with database logging
  app.post("/api/voice/enhance", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      const { enhanceSpeechForChat } = await import("./groq-service");
      const result = await enhanceSpeechForChat(text);
      
      // Save to database
      try {
        await storage.createVoiceAiResponse({
          originalText: result.original,
          rephrasedText: result.enhanced,
          wasSpoken: false, // Will be updated when TTS plays it
        });
      } catch (dbError) {
        console.error("Failed to save voice AI response to DB:", dbError);
        // Don't fail the request if DB save fails
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error enhancing speech:", error);
      res.status(500).json({ error: "Failed to enhance speech" });
    }
  });

  // Voice AI Response History - for Monitor page
  app.get("/api/voice/responses", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const responses = await storage.getVoiceAiResponses(limit);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching voice AI responses:", error);
      res.status(500).json({ error: "Failed to fetch voice AI responses" });
    }
  });

  return httpServer;
}
