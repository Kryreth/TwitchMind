import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startAiLearning } from "./ai-learning-service";
import { DachiStreamService } from "./dachistream-service";
import { storage } from "./storage";
import { generateDachiStreamResponse } from "./groq-service";
import { setDachiStreamService } from "./twitch-client";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Initialize DachiStream service
  const dachiStreamService = new DachiStreamService(storage);

  // Connect DachiStream service to Twitch client
  setDachiStreamService(dachiStreamService);

  // Export services for use in routes
  (app as any).dachiStreamService = dachiStreamService;

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Start AI learning service
    startAiLearning(10).catch(error => {
      console.error("Failed to start AI learning service:", error);
    });

    // Start DachiStream service with AI response callback and status updates
    await dachiStreamService.start(
      async (message, context) => {
        try {
          const allSettings = await storage.getSettings();
          const settings = allSettings[0];
          
          if (settings && settings.dachipoolEnabled) {
            // Generate AI response with guardrails
            const aiResponse = await generateDachiStreamResponse(
              message.message,
              context,
              {
                model: settings.dachipoolAiModel || "llama-3.3-70b-versatile",
                temperature: (settings.dachipoolAiTemp || 7) / 10,
                maxChars: settings.dachipoolMaxChars || 1000,
                energy: settings.dachipoolEnergy || "Balanced",
                personality: settings.aiPersonality || "Casual",
                topicAllowlist: settings.topicAllowlist as string[] || [],
                topicBlocklist: settings.topicBlocklist as string[] || [],
                streamerVoiceOnlyMode: settings.streamerVoiceOnlyMode || false,
              }
            );

            if (aiResponse) {
              console.log(`DachiStream AI Response: ${aiResponse}`);
              
              // Log the AI response
              dachiStreamService.logAIResponse(aiResponse);
              
              // Send to Twitch chat if auto-send is enabled
              if (settings.dachiastreamAutoSendToChat) {
                const { sendChatMessage } = await import("./twitch-client");
                const sent = await sendChatMessage(aiResponse);
                if (sent) {
                  console.log("✓ AI response sent to Twitch chat");
                } else {
                  console.error("✗ Failed to send AI response to Twitch chat");
                }
              }
            }
          }
        } catch (error) {
          console.error("Error in DachiStream callback:", error);
        }
      },
      (state) => {
        // Status updates are handled internally, no need for additional broadcast here
      }
    );
  });
})();
