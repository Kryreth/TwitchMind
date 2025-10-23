import tmi from "tmi.js";
import { storage } from "./storage";
import { analyzeChatMessage, generateAiResponse } from "./openai-service";
import { WebSocket } from "ws";
import type { DachiStreamService } from "./dachistream-service";
import { twitchOAuthService } from "./twitch-oauth-service";
import { ActiveChattersService } from "./active-chatters-service";

let twitchClient: tmi.Client | null = null;
const connectedClients: Set<WebSocket> = new Set();
let dachiStreamService: DachiStreamService | null = null;
export const activeChattersService = new ActiveChattersService();

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

/**
 * Ensures the access token is valid, refreshing if necessary
 */
async function ensureValidAccessToken() {
  const user = await storage.getAuthenticatedUser();
  
  if (!user) {
    console.log("No authenticated user found");
    return null;
  }
  
  // Check if token is expired or about to expire
  if (twitchOAuthService.isTokenExpired(user.tokenExpiresAt)) {
    console.log("Access token is expired or expiring soon, attempting refresh...");
    
    if (!user.refreshToken) {
      console.error("No refresh token available - user needs to re-authenticate");
      return null;
    }
    
    try {
      // Refresh the token
      const tokenResponse = await twitchOAuthService.refreshAccessToken(user.refreshToken);
      
      // Calculate new expiration
      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
      
      // Update in database
      await storage.updateAuthenticatedUserTokens(
        user.id,
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        expiresAt
      );
      
      console.log(`✓ Token refreshed successfully, expires at: ${expiresAt.toISOString()}`);
      
      return tokenResponse.access_token;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      console.error("User needs to re-authenticate via Settings page");
      return null;
    }
  }
  
  // Token is still valid
  console.log(`✓ Access token is valid until: ${user.tokenExpiresAt?.toISOString()}`);
  return user.accessToken;
}

export async function connectToTwitch(channel: string, username: string = "justinfan12345") {
  if (twitchClient) {
    try {
      await twitchClient.disconnect();
    } catch (error) {
      console.log("Note: Previous Twitch client was already disconnected");
    }
  }

  // Ensure we have a valid access token (refresh if needed)
  const validAccessToken = await ensureValidAccessToken();
  
  // Get the authenticated user (may have been updated with new token)
  const authenticatedUser = await storage.getAuthenticatedUser();
  console.log(`[DEBUG] getAuthenticatedUser result:`, authenticatedUser ? {
    username: authenticatedUser.twitchUsername,
    hasAccessToken: !!authenticatedUser.accessToken,
    tokenLength: authenticatedUser.accessToken?.length || 0,
    tokenExpires: authenticatedUser.tokenExpiresAt?.toISOString()
  } : 'null');
  
  let identity: { username: string; password?: string } | undefined;

  if (validAccessToken && authenticatedUser) {
    // Use OAuth token for authenticated connection
    identity = {
      username: authenticatedUser.twitchUsername,
      password: `oauth:${validAccessToken}`,
    };
    console.log(`Connecting to Twitch as authenticated user: ${authenticatedUser.twitchUsername}`);
  } else if (username !== "justinfan12345") {
    // If specific username provided but no token, log warning and connect anonymously
    console.warn(`No valid OAuth token found for ${username}, connecting anonymously instead`);
    identity = undefined; // Anonymous connection
  } else {
    // Fully anonymous connection
    identity = undefined;
  }

  twitchClient = new tmi.Client({
    options: { debug: false },
    connection: {
      reconnect: true,
      secure: true,
    },
    identity: identity,
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

      // Track active chatter
      const userProfile = await storage.getUserProfile(userId);
      activeChattersService.addMessage(chatMessage, userProfile || undefined);

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

  // Listen for incoming raids
  twitchClient.on("raided", async (channel, username, viewers) => {
    console.log(`🎉 RAID! ${username} raided with ${viewers} viewers!`);
    
    try {
      // Store the raid in database
      const raid = await storage.createRaid({
        fromUserId: username, // Use username as fallback since tags aren't available
        fromUsername: username,
        fromDisplayName: username,
        viewers: viewers || 0,
      });

      // Broadcast raid notification to connected clients
      broadcastToClients("incoming_raid", raid);
      
      // Also log it as a chat message for history
      await storage.createChatMessage({
        userId: username,
        username,
        message: `🎉 RAID from ${username} with ${viewers} viewers!`,
        channel,
        eventType: "raid",
        userColor: "#9146FF",
        badges: {},
        emotes: null,
        metadata: { viewers: viewers || 0 },
      });
    } catch (error) {
      console.error("Error processing raid:", error);
    }
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

/**
 * Send a message to the currently connected Twitch channel
 */
export async function sendChatMessage(message: string): Promise<boolean> {
  if (!twitchClient) {
    console.error("Cannot send chat message: Twitch client not connected");
    return false;
  }

  const authenticatedUser = await storage.getAuthenticatedUser();
  if (!authenticatedUser) {
    console.error("Cannot send chat message: No authenticated user");
    return false;
  }

  const channel = authenticatedUser.twitchUsername;
  
  try {
    await twitchClient.say(channel, message);
    console.log(`Sent to Twitch chat: ${message}`);
    return true;
  } catch (error) {
    console.error("Failed to send message to Twitch chat:", error);
    return false;
  }
}
