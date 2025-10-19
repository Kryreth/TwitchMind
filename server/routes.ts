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
} from "@shared/schema";
import { connectToTwitch, disconnectFromTwitch, addWebSocketClient } from "./twitch-client";

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
      
      if (req.body.twitchChannel && req.body.twitchUsername) {
        await connectToTwitch(req.body.twitchChannel, req.body.twitchUsername);
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(400).json({ error: "Failed to update settings" });
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

  // Auto-connect to Twitch if settings exist
  const existingSettings = await storage.getSettings();
  if (existingSettings.length > 0 && existingSettings[0].twitchChannel) {
    const setting = existingSettings[0];
    try {
      await connectToTwitch(setting.twitchChannel, setting.twitchUsername || undefined);
      console.log(`Auto-connected to Twitch channel: ${setting.twitchChannel}`);
    } catch (error) {
      console.error("Failed to auto-connect to Twitch:", error);
    }
  }

  return httpServer;
}
