import { useState, useEffect, useCallback, useRef } from "react";

export interface TTSVoice {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
}

interface TTSSettings {
  enabled: boolean;
  voice: string | null; // voice name
  pitch: number; // 0.5 - 2
  rate: number; // 0.5 - 2
  volume: number; // 0 - 1
}

interface UseTextToSpeechReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  voices: TTSVoice[];
  settings: TTSSettings;
  speak: (text: string) => void;
  stop: () => void;
  updateSettings: (settings: Partial<TTSSettings>) => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSupported] = useState(
    typeof window !== "undefined" && "speechSynthesis" in window
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [settings, setSettings] = useState<TTSSettings>({
    enabled: false,
    voice: null,
    pitch: 1.0,
    rate: 1.0,
    volume: 1.0,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const voiceList = availableVoices.map((voice) => ({
        voice,
        name: voice.name,
        lang: voice.lang,
      }));
      setVoices(voiceList);
      
      // Set default voice if not set
      if (!settings.voice && voiceList.length > 0) {
        // Prefer English voices
        const englishVoice = voiceList.find((v) => v.lang.startsWith("en"));
        setSettings((prev) => ({
          ...prev,
          voice: englishVoice ? englishVoice.name : voiceList[0].name,
        }));
      }
    };

    loadVoices();
    
    // Voices might load asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Find selected voice
      const selectedVoice = voices.find((v) => v.name === settings.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice.voice;
      }

      utterance.pitch = settings.pitch;
      utterance.rate = settings.rate;
      utterance.volume = settings.volume;

      utterance.onstart = () => {
        console.log("TTS started:", text);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log("TTS ended");
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error("TTS error:", event);
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, voices, settings]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const updateSettings = useCallback((newSettings: Partial<TTSSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    isSupported,
    isSpeaking,
    voices,
    settings,
    speak,
    stop,
    updateSettings,
  };
}
