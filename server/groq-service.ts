// GroqCloud AI Service - Migrated from OpenAI
import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface SentimentAnalysisResult {
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  toxicity: boolean;
  categories: string[];
}

export interface EnhancedSpeechResult {
  original: string;
  enhanced: string;
}

export async function analyzeChatMessage(message: string): Promise<SentimentAnalysisResult> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a sentiment analysis expert for Twitch chat messages. Analyze the sentiment and toxicity of messages.
          
Respond with JSON in this exact format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": 1-5 (1=very negative, 5=very positive),
  "toxicity": true | false,
  "categories": ["category1", "category2"] (e.g., ["friendly", "gaming"] or ["toxic", "spam"])
}`,
        },
        {
          role: "user",
          content: `Analyze this Twitch chat message: "${message}"`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      sentiment: result.sentiment || "neutral",
      sentimentScore: Math.max(1, Math.min(5, result.sentimentScore || 3)),
      toxicity: result.toxicity || false,
      categories: result.categories || [],
    };
  } catch (error) {
    console.error("Error analyzing message with Groq:", error);
    return {
      sentiment: "neutral",
      sentimentScore: 3,
      toxicity: false,
      categories: ["error"],
    };
  }
}

export async function generateAiResponse(prompt: string, userMessage: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Unable to generate response.";
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Sorry, I couldn't process that request.";
  }
}

export interface DachiStreamSettings {
  model: string;
  temperature: number;
  maxChars: number;
  energy: string;
  personality: string;
  topicAllowlist: string[];
  topicBlocklist: string[];
  streamerVoiceOnlyMode: boolean;
}

export async function generateDachiStreamResponse(
  userMessage: string,
  context: string,
  settings: DachiStreamSettings
): Promise<string> {
  try {
    // Build system message with guardrails
    const systemParts: string[] = [];

    // Core personality traits based on selected personality
    const personalityPrompts: Record<string, string> = {
      Casual: "You are DachiDachi, a friendly and relaxed AI chat companion. Respond like you're chatting with friends - keep it chill, casual, and conversational.",
      Comedy: "You are DachiDachi, a witty and humorous AI chat companion. Make jokes, use puns, and keep the vibe light and funny. Don't be afraid to be silly!",
      Quirky: "You are DachiDachi, a unique and playful AI chat companion. Be creative, unexpected, and add fun twists to your responses. Embrace the weird and wonderful!",
      Serious: "You are DachiDachi, a professional and focused AI chat companion. Be direct, informative, and to-the-point. Keep responses clear and helpful.",
      Gaming: "You are DachiDachi, an energetic gamer AI companion. Use gaming references, talk about strategies, and match the competitive gaming vibe. Let's go!",
      Professional: "You are DachiDachi, a polished and business-like AI chat companion. Maintain a professional tone, be articulate, and communicate with clarity.",
    };

    const basePersonality = personalityPrompts[settings.personality] || personalityPrompts.Casual;
    
    // Modify energy level based on settings
    let energyModifier = "";
    if (settings.energy === "High") {
      energyModifier = " Respond with extra energy, excitement, and enthusiasm!";
    } else if (settings.energy === "Low") {
      energyModifier = " Keep your responses brief and calm.";
    }

    systemParts.push(basePersonality + energyModifier);

    // Topic guardrails
    if (settings.topicAllowlist.length > 0) {
      systemParts.push(
        `ALLOWED TOPICS: You should mainly discuss ${settings.topicAllowlist.join(", ")}. ` +
        `If the conversation drifts to other topics, gently steer it back to these areas.`
      );
    }

    if (settings.topicBlocklist.length > 0) {
      systemParts.push(
        `BLOCKED TOPICS: NEVER discuss ${settings.topicBlocklist.join(", ")}. ` +
        `If asked about these topics, politely decline and suggest talking about something else.`
      );
    }

    // Streamer voice-only mode
    if (settings.streamerVoiceOnlyMode) {
      systemParts.push(
        "STREAMER VOICE-ONLY MODE: Only respond if the context includes recent messages from the streamer. " +
        "If the streamer hasn't spoken recently, output 'SKIP_RESPONSE' instead of a message."
      );
    }

    // Character limit
    systemParts.push(
      `RESPONSE LENGTH: Keep your response under ${settings.maxChars} characters. ` +
      `Be concise and impactful.`
    );

    // General guidelines
    systemParts.push(
      "GUIDELINES:\n" +
      "- Be authentic and conversational\n" +
      "- Reference chat context when relevant\n" +
      "- Use the user's personality info to personalize your response\n" +
      "- Avoid repetitive phrases\n" +
      "- Don't apologize excessively\n" +
      "- If you can't help with something, be direct and brief"
    );

    const systemMessage = systemParts.join("\n\n");

    // Build user message with context
    const fullUserMessage = context
      ? `${context}\n\n---\n\nRESPOND TO: ${userMessage}`
      : `RESPOND TO: ${userMessage}`;

    const response = await groq.chat.completions.create({
      model: settings.model,
      temperature: settings.temperature,
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: fullUserMessage,
        },
      ],
      max_tokens: Math.ceil(settings.maxChars / 3),
    });

    const aiResponse = response.choices[0].message.content || "Unable to generate response.";

    // Check if AI wants to skip (streamer voice-only mode)
    if (aiResponse.includes("SKIP_RESPONSE")) {
      return "";
    }

    // Trim to max characters
    if (aiResponse.length > settings.maxChars) {
      return aiResponse.substring(0, settings.maxChars - 3) + "...";
    }

    return aiResponse;
  } catch (error) {
    console.error("Error generating DachiStream response:", error);
    return "";
  }
}

export async function cleanupSpeechText(rawText: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a speech-to-text cleanup assistant. " +
            "Take raw transcribed text and clean it up for chat: fix grammar, remove filler words (um, uh, like), " +
            "correct obvious mistakes, and make it concise. Preserve the original meaning and tone. " +
            "Output only the cleaned text, nothing else.",
        },
        {
          role: "user",
          content: rawText,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    return response.choices[0].message.content || rawText;
  } catch (error) {
    console.error("Error cleaning up speech text:", error);
    return rawText;
  }
}

export async function enhanceSpeechForChat(rawText: string): Promise<EnhancedSpeechResult> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "Rephrase the spoken text to say the same thing in different words. " +
            "Remove stutters and filler words (um, uh, like). " +
            "Keep the EXACT same meaning and tone. Do NOT add personality or change the message. " +
            "Output only the rephrased text, nothing else.",
        },
        {
          role: "user",
          content: rawText,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const enhanced = response.choices[0].message.content || rawText;

    return {
      original: rawText,
      enhanced: enhanced.trim(),
    };
  } catch (error) {
    console.error("Error enhancing speech:", error);
    return {
      original: rawText,
      enhanced: rawText,
    };
  }
}
