import type { IStorage } from "./storage";

export interface ElevenLabsUsage {
  characterCount: number;
  characterLimit: number;
  percentUsed: number;
  warningTriggered: boolean;
}

export interface TTSResult {
  audio?: Buffer;
  error?: string;
  skipped: boolean;
  reason?: string;
}

export class ElevenLabsService {
  private storage: IStorage;
  private lastTTSTimestamp: number = 0;
  private usageIntervalId: NodeJS.Timeout | null = null;
  private apiKey: string | undefined;

  constructor(storage: IStorage, apiKey?: string) {
    this.storage = storage;
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY;
  }

  async startUsagePolling() {
    // Poll usage every 60 seconds
    this.usageIntervalId = setInterval(() => {
      this.updateUsage();
    }, 60000);

    // Initial update
    await this.updateUsage();
    
    console.log("ElevenLabs usage polling started (60-second interval)");
  }

  stopUsagePolling() {
    if (this.usageIntervalId) {
      clearInterval(this.usageIntervalId);
      this.usageIntervalId = null;
    }
    console.log("ElevenLabs usage polling stopped");
  }

  async updateUsage(): Promise<void> {
    if (!this.apiKey) {
      console.warn("ElevenLabs API key not configured");
      return;
    }

    try {
      const response = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Update settings with usage data
      const allSettings = await this.storage.getSettings();
      if (allSettings.length > 0) {
        const settings = allSettings[0];
        
        await this.storage.updateSettings(settings.id, {
          elevenlabsUsageQuota: data.character_limit || 0,
          elevenlabsUsageUsed: data.character_count || 0,
          elevenlabsUsageLastChecked: new Date(),
        });

        console.log(
          `ElevenLabs usage: ${data.character_count}/${data.character_limit} characters ` +
          `(${Math.round((data.character_count / data.character_limit) * 100)}%)`
        );
      }
    } catch (error) {
      console.error("Error fetching ElevenLabs usage:", error);
    }
  }

  async getUsage(): Promise<ElevenLabsUsage> {
    const allSettings = await this.storage.getSettings();
    const settings = allSettings[0];

    if (!settings || !settings.elevenlabsUsageQuota) {
      return {
        characterCount: 0,
        characterLimit: 0,
        percentUsed: 0,
        warningTriggered: false,
      };
    }

    const percentUsed = (settings.elevenlabsUsageUsed || 0) / settings.elevenlabsUsageQuota * 100;

    return {
      characterCount: settings.elevenlabsUsageUsed || 0,
      characterLimit: settings.elevenlabsUsageQuota,
      percentUsed,
      warningTriggered: percentUsed >= 85,
    };
  }

  async generateTTS(text: string, voiceId?: string): Promise<TTSResult> {
    if (!this.apiKey) {
      return {
        skipped: true,
        reason: "ElevenLabs API key not configured",
      };
    }

    try {
      // Get settings
      const allSettings = await this.storage.getSettings();
      const settings = allSettings[0];

      if (!settings) {
        return {
          skipped: true,
          reason: "Settings not found",
        };
      }

      // Check if TTS is enabled
      if (!settings.audioAiVoiceActive) {
        return {
          skipped: true,
          reason: "AI voice disabled in settings",
        };
      }

      // Check cooldown
      const now = Date.now();
      const cooldownMs = (settings.audioCooldownBetweenReplies || 5) * 1000;
      if (now - this.lastTTSTimestamp < cooldownMs) {
        return {
          skipped: true,
          reason: "Cooldown in effect",
        };
      }

      // Check usage quota
      const usage = await this.getUsage();
      const estimatedChars = text.length;
      if (usage.characterCount + estimatedChars > usage.characterLimit) {
        // Fallback to text-only if enabled
        if (settings.audioFallbackToTextOnly) {
          return {
            skipped: true,
            reason: "Quota exceeded, fallback to text-only",
          };
        } else {
          return {
            skipped: true,
            error: "ElevenLabs quota exceeded",
          };
        }
      }

      // Trim text to max voice length
      const maxLength = settings.audioMaxVoiceLength || 500;
      const trimmedText = text.length > maxLength 
        ? text.substring(0, maxLength - 3) + "..."
        : text;

      // Use voice ID from settings or parameter
      const finalVoiceId = voiceId || settings.elevenlabsVoiceId || "21m00Tcm4TlvDq8ikWAM"; // Default voice

      // Generate TTS
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`,
        {
          method: "POST",
          headers: {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": this.apiKey,
          },
          body: JSON.stringify({
            text: trimmedText,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS error: ${response.status}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // Update last TTS timestamp
      this.lastTTSTimestamp = now;

      // Update usage (optimistic - actual usage will be updated on next poll)
      await this.storage.updateSettings(settings.id, {
        elevenlabsUsageUsed: (settings.elevenlabsUsageUsed || 0) + trimmedText.length,
      });

      return {
        audio: audioBuffer,
        skipped: false,
      };
    } catch (error) {
      console.error("Error generating TTS:", error);
      return {
        skipped: true,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  canGenerateTTS(): boolean {
    const cooldownMs = 5000; // Default 5 seconds
    const now = Date.now();
    return now - this.lastTTSTimestamp >= cooldownMs;
  }
}
