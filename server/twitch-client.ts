import tmi from "tmi.js";
import { storage } from "./storage";
import { analyzeChatMessage, generateAiResponse } from "./openai-service";
import { WebSocket } from "ws";
import type { DachiStreamService } from "./dachistream-service";

let twitchClient: tmi.Client | null = null;
const connectedClients: Set<WebSocket> = new Set();
let dachiStreamService: DachiStreamService | null = null;

export function setDachiStreamService(service: DachiStreamService) {
  dachiStreamService = service;
}

export function addWebSocketClient(ws: WebSocket) {
  connectedClients.add(ws);
  ws.on("close", () => {
    connectedClients.delete(ws);
  });
}

function broadcastToClients(event: string, data: any) {
  const message = JSON.stringify({ event, data });
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function connectToTwitch(channel: string, username: string = "justinfan12345") {
  if (twitchClient) {
    await twitchClient.disconnect();
  }

  twitchClient = new tmi.Client({
    options: { debug: false },
    connection: {
      reconnect: true,
      secure: true,
    },
    identity: {
      username: username,
      password: undefined,
    },
    channels: [channel],
  });

  twitchClient.on("message", async (channel, tags, message, self) => {
    if (self) return;

    const username = tags["display-name"] || tags.username || "Anonymous";
    const userColor = tags.color || "#9146FF";
    const userId = tags["user-id"] || `anonymous_${username}`;
    
    const badges = tags.badges || {};
    const isVip = badges.vip === "1" || false;
    const isMod = badges.moderator === "1" || badges.broadcaster === "1" || false;
    const isSubscriber = badges.subscriber !== undefined || badges.founder !== undefined || false;

    try {
      await storage.createOrUpdateUserProfile({
        userId,
        username,
        isVip,
        isMod,
        isSubscriber,
        wasAnonymous: !tags["user-id"],
      });

      await storage.updateUserLastSeen(userId);

      const settingsList = await storage.getSettings();
      const settings = settingsList.length > 0 ? settingsList[0] : null;
      
      if (settings && settings.autoShoutoutsEnabled && isVip) {
        const userProfile = await storage.getUserProfile(userId);
        if (userProfile) {
          const cooldownHours = settings.dachipoolShoutoutCooldownHours || 24;
          const cooldownMs = cooldownHours * 60 * 60 * 1000;
          const now = new Date().getTime();
          const lastShoutout = userProfile.shoutoutLastGiven?.getTime() || 0;
          
          if (now - lastShoutout > cooldownMs) {
            await storage.updateShoutoutTimestamp(userId);
            const shoutoutMessage = `🎉 Welcome VIP @${username}! Thanks for being amazing! 💜`;
            broadcastToClients("auto_shoutout", {
              username,
              message: shoutoutMessage,
            });
          }
        }
      }

      const chatMessage = await storage.createChatMessage({
        userId,
        username,
        message,
        channel,
        userColor,
        badges: tags.badges ? Object.fromEntries(
          Object.entries(tags.badges).filter(([_, v]) => v !== undefined)
        ) as Record<string, string> : {},
        emotes: tags.emotes || null,
      });

      // Add message to DachiStream buffer
      if (dachiStreamService) {
        dachiStreamService.addMessage(chatMessage);
      }

      const enableAiAnalysis = settings ? settings.enableAiAnalysis : true;

      let analysis = null;
      if (enableAiAnalysis) {
        const aiResult = await analyzeChatMessage(message);
        analysis = await storage.createAiAnalysis({
          messageId: chatMessage.id,
          sentiment: aiResult.sentiment,
          sentimentScore: aiResult.sentimentScore,
          toxicity: aiResult.toxicity,
          categories: aiResult.categories,
        });
      }

      broadcastToClients("new_message", {
        ...chatMessage,
        analysis,
      });

      const commands = await storage.getAiCommands();
      const matchedCommand = commands.find(
        (cmd) => cmd.enabled && message.toLowerCase().startsWith(cmd.trigger.toLowerCase())
      );

      if (matchedCommand) {
        await storage.incrementCommandUsage(matchedCommand.id);
        
        const response = await generateAiResponse(matchedCommand.prompt, message);
        
        broadcastToClients("command_response", {
          command: matchedCommand.trigger,
          response,
        });
      }
    } catch (error) {
      console.error("Error processing Twitch message:", error);
    }
  });

  twitchClient.on("connected", (address, port) => {
    console.log(`Connected to Twitch chat at ${address}:${port}`);
    broadcastToClients("twitch_connected", { channel });
  });

  twitchClient.on("disconnected", (reason) => {
    console.log(`Disconnected from Twitch: ${reason}`);
    broadcastToClients("twitch_disconnected", { reason });
  });

  await twitchClient.connect();
  return twitchClient;
}

export function disconnectFromTwitch() {
  if (twitchClient) {
    twitchClient.disconnect();
    twitchClient = null;
  }
}

export function getTwitchClient() {
  return twitchClient;
}
