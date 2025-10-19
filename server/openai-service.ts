// Reference: javascript_openai blueprint
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SentimentAnalysisResult {
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  toxicity: boolean;
  categories: string[];
}

export async function analyzeChatMessage(message: string): Promise<SentimentAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
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
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      sentiment: result.sentiment || "neutral",
      sentimentScore: Math.max(1, Math.min(5, result.sentimentScore || 3)),
      toxicity: result.toxicity || false,
      categories: result.categories || [],
    };
  } catch (error) {
    console.error("Error analyzing message with OpenAI:", error);
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
    const response = await openai.chat.completions.create({
      model: "gpt-5",
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
      max_completion_tokens: 200,
    });

    return response.choices[0].message.content || "Unable to generate response.";
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Sorry, I couldn't process that request.";
  }
}
