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
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldBeListeningRef = useRef(false);
  const accumulatedTranscriptRef = useRef("");
  const lastSpeechTimeRef = useRef<number>(0);

  // Check if browser supports speech recognition
  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const enhanceSpeech = useCallback(async (text: string) => {
    if (!text.trim()) return;

    console.log("Enhancing speech:", text);
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
    if (!isSupported || !recognitionRef.current) return;

    console.log("User clicked start listening");
    shouldBeListeningRef.current = true;
    accumulatedTranscriptRef.current = "";
    setTranscript("");
    setEnhancedText("");
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      onStart?.();
    } catch (error: any) {
      console.error("Failed to start recognition:", error);
      if (error.message && error.message.includes("already started")) {
        // Already running, just update state
        setIsListening(true);
      } else {
        onError?.("Failed to start voice recognition");
      }
    }
  }, [isSupported, onStart, onError]);

  const stopListening = useCallback(() => {
    console.log("User clicked stop listening");
    shouldBeListeningRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error: any) {
        console.error("Failed to stop recognition:", error);
      }
    }
    
    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    // Trigger AI enhancement immediately if there's accumulated text
    if (autoEnhance && accumulatedTranscriptRef.current.trim()) {
      console.log("User stopped listening - rephrasing now:", accumulatedTranscriptRef.current.trim());
      enhanceSpeech(accumulatedTranscriptRef.current.trim());
    }
    
    setIsListening(false);
    onEnd?.();
  }, [onEnd, autoEnhance, enhanceSpeech]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setEnhancedText("");
    accumulatedTranscriptRef.current = "";
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false; // Set to false so we can auto-restart
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("Browser voice recognition started");
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // Update accumulated transcript with final results
      if (finalTranscript) {
        accumulatedTranscriptRef.current += finalTranscript;
        lastSpeechTimeRef.current = Date.now();
        console.log("Got final speech:", finalTranscript);
      }

      // Display accumulated + interim
      const currentTranscript = (accumulatedTranscriptRef.current + interimTranscript).trim();
      setTranscript(currentTranscript);
      onTranscript?.(currentTranscript);

      // Clear existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      // Set new silence timeout (5 seconds after last speech)
      if (currentTranscript.trim() && autoEnhance && shouldBeListeningRef.current) {
        console.log("Resetting 5-second silence timer");
        silenceTimeoutRef.current = setTimeout(() => {
          const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
          console.log(`Silence detected (${timeSinceLastSpeech}ms since last speech) - rephrasing:`, accumulatedTranscriptRef.current.trim());
          enhanceSpeech(accumulatedTranscriptRef.current.trim());
        }, 5000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Voice recognition error:", event.error);
      
      // Don't treat "no-speech" as a fatal error if we're meant to be listening
      if (event.error === "no-speech" && shouldBeListeningRef.current) {
        console.log("No speech detected, will auto-restart");
        return;
      }
      
      if (event.error !== "aborted") {
        onError?.(event.error);
      }
    };

    recognition.onend = () => {
      console.log("Browser voice recognition ended");
      
      // Check if we should trigger AI enhancement after 5 seconds
      const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
      if (accumulatedTranscriptRef.current.trim() && 
          autoEnhance && 
          shouldBeListeningRef.current && 
          timeSinceLastSpeech < 2000) { // If speech was recent (within 2s), start 5s timer
        
        console.log("Starting 5-second silence timer after recognition ended");
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        silenceTimeoutRef.current = setTimeout(() => {
          console.log(`5 seconds of silence detected - rephrasing:`, accumulatedTranscriptRef.current.trim());
          enhanceSpeech(accumulatedTranscriptRef.current.trim());
        }, 5000);
      }
      
      // Auto-restart if user still wants to be listening
      if (shouldBeListeningRef.current) {
        console.log("Auto-restarting voice recognition...");
        setTimeout(() => {
          if (shouldBeListeningRef.current) {
            try {
              recognition.start();
            } catch (error: any) {
              console.error("Failed to auto-restart:", error);
            }
          }
        }, 100); // Small delay to avoid rapid restart issues
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldBeListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [isSupported, continuous, autoEnhance, onTranscript, onError, enhanceSpeech]);

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
