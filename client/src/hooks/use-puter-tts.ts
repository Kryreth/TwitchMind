import { useState, useCallback, useRef } from "react";

declare global {
  interface Window {
    puter?: {
      ai: {
        txt2speech: (
          text: string,
          options?: {
            voice?: string;
            engine?: "standard" | "neural" | "generative";
            language?: string;
          }
        ) => Promise<{
          play: () => void;
          pause: () => void;
          stop: () => void;
        }>;
      };
    };
  }
}

export interface PuterTTSSettings {
  enabled: boolean;
  voice: string;
  engine: "standard" | "neural" | "generative";
  language: string;
  volume: number; // 0-1
}

export function usePuterTTS() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [settings, setSettings] = useState<PuterTTSSettings>({
    enabled: true,
    voice: "Joanna",
    engine: "neural",
    language: "en-US",
    volume: 1.0,
  });
  
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Check if Puter.js is loaded
  const checkSupport = useCallback(() => {
    const supported = typeof window.puter?.ai?.txt2speech === "function";
    setIsSupported(supported);
    return supported;
  }, []);

  // Speak text using Puter TTS
  const speak = useCallback(
    async (text: string) => {
      if (!settings.enabled) {
        console.log("Puter TTS is disabled");
        return;
      }

      // Check support each time in case script loaded after hook initialization
      if (!checkSupport()) {
        console.error("Puter.js TTS not available");
        return;
      }

      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // Limit text to 3000 characters (Puter.js limit)
      const trimmedText = text.substring(0, 3000);

      try {
        setIsSpeaking(true);
        console.log(`[Puter TTS] Generating ${settings.engine} audio for:`, trimmedText);
        
        const audioStream = await window.puter!.ai.txt2speech(trimmedText, {
          voice: settings.voice,
          engine: settings.engine,
          language: settings.language,
        });

        // Create audio element for better control
        const audio = new Audio();
        // @ts-ignore - Puter returns a playable stream
        audio.src = audioStream;
        audio.volume = settings.volume;
        
        currentAudioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
          console.log("[Puter TTS] Audio playback ended");
        };

        audio.onerror = (error) => {
          console.error("[Puter TTS] Audio playback error:", error);
          setIsSpeaking(false);
          currentAudioRef.current = null;
        };

        await audio.play();
        console.log(`[Puter TTS] Playing ${settings.engine} audio`);
      } catch (error) {
        console.error("[Puter TTS] Error:", error);
        setIsSpeaking(false);
      }
    },
    [settings, checkSupport]
  );

  // Stop speaking
  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsSpeaking(false);
      console.log("[Puter TTS] Stopped");
    }
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<PuterTTSSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Initialize support check on first render
  useState(() => {
    // Delay check to ensure Puter script has loaded
    setTimeout(checkSupport, 100);
  });

  return {
    isSupported,
    isSpeaking,
    settings,
    speak,
    stop,
    updateSettings,
  };
}
