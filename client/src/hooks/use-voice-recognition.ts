import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

interface VoiceRecognitionOptions {
  onTranscript?: (transcript: string) => void;
  onEnhanced?: (original: string, enhanced: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  autoEnhance?: boolean;
  continuous?: boolean;
}

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  transcript: string;
  enhancedText: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  isEnhancing: boolean;
}

export function useVoiceRecognition(options: VoiceRecognitionOptions = {}): UseVoiceRecognitionReturn {
  const {
    onTranscript,
    onEnhanced,
    onError,
    onStart,
    onEnd,
    autoEnhance = true,
    continuous = true,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if browser supports speech recognition
  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const enhanceSpeech = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsEnhancing(true);
    try {
      const response = await apiRequest("POST", "/api/voice/enhance", { text });
      const result: { original: string; enhanced: string } = await response.json();
      setEnhancedText(result.enhanced);
      onEnhanced?.(result.original, result.enhanced);
    } catch (error: any) {
      console.error("Failed to enhance speech:", error);
      onError?.("Failed to enhance speech");
    } finally {
      setIsEnhancing(false);
    }
  }, [onEnhanced, onError]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current || isListening) return;

    try {
      recognitionRef.current.start();
      setIsListening(true);
      onStart?.();
    } catch (error: any) {
      console.error("Failed to start recognition:", error);
      onError?.("Failed to start voice recognition");
    }
  }, [isSupported, isListening, onStart, onError]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    try {
      recognitionRef.current.stop();
      setIsListening(false);
      onEnd?.();
    } catch (error: any) {
      console.error("Failed to stop recognition:", error);
    }
  }, [isListening, onEnd]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setEnhancedText("");
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("Voice recognition started");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = (finalTranscript + interimTranscript).trim();
      setTranscript(currentTranscript);
      onTranscript?.(currentTranscript);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Wait 5 seconds of silence before sending to AI
      // Only set timeout if we have any transcript
      if (currentTranscript.trim() && autoEnhance) {
        console.log("Setting 5-second timeout for AI rephrasing:", currentTranscript);
        timeoutRef.current = setTimeout(() => {
          console.log("5 seconds passed - calling AI to rephrase:", currentTranscript);
          enhanceSpeech(currentTranscript.trim());
        }, 5000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Voice recognition error:", event.error);
      setIsListening(false);
      onError?.(event.error);
    };

    recognition.onend = () => {
      console.log("Voice recognition ended");
      setIsListening(false);
      onEnd?.();
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isSupported, continuous, autoEnhance, onTranscript, onError, onEnd, enhanceSpeech]);

  return {
    isListening,
    transcript,
    enhancedText,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    isEnhancing,
  };
}
