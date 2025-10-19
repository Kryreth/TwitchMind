import { storage } from "./storage";
import { generateAiResponse } from "./openai-service";

let learningInterval: NodeJS.Timeout | null = null;

export async function startAiLearning(intervalMinutes: number = 10) {
  if (learningInterval) {
    clearInterval(learningInterval);
  }

  const runLearning = async () => {
    try {
      const users = await storage.getAllUserProfiles();
      
      for (const user of users) {
        const messages = await storage.getMessagesByUser(user.userId, 50);
        
        if (messages.length >= 5) {
          const recentMessages = messages.slice(0, 20).map(m => m.message).join("\n");
          
          const prompt = `Analyze the following chat messages from @${user.username} and provide a 1-2 sentence personality summary that captures their tone, behavior, and chat style for in-stream personalization. Be concise and insightful.

Messages:
${recentMessages}

Provide ONLY the summary, no additional text.`;

          try {
            const summary = await generateAiResponse(prompt, "");
            
            const insight = await storage.getUserInsight(user.userId);
            const tags = extractTags(summary);
            
            await storage.saveUserInsight({
              userId: user.userId,
              summary: summary.trim(),
              totalMessages: messages.length,
              recentTags: tags,
            });
            
            console.log(`Updated AI insight for user ${user.username}`);
          } catch (error) {
            console.error(`Failed to generate insight for ${user.username}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error in AI learning cycle:", error);
    }
  };

  await runLearning();

  learningInterval = setInterval(runLearning, intervalMinutes * 60 * 1000);
  console.log(`AI learning service started (running every ${intervalMinutes} minutes)`);
}

export function stopAiLearning() {
  if (learningInterval) {
    clearInterval(learningInterval);
    learningInterval = null;
    console.log("AI learning service stopped");
  }
}

function extractTags(summary: string): string[] {
  const tags: string[] = [];
  const keywords = {
    playful: ["playful", "fun", "jokes", "humor", "funny"],
    helpful: ["helpful", "supportive", "kind", "friendly"],
    enthusiastic: ["enthusiastic", "excited", "energetic", "active"],
    analytical: ["analytical", "thoughtful", "detailed", "technical"],
    casual: ["casual", "relaxed", "chill", "laid-back"],
    positive: ["positive", "upbeat", "optimistic", "happy"],
    engaged: ["engaged", "interactive", "participates", "involved"],
  };

  const lowerSummary = summary.toLowerCase();
  for (const [tag, words] of Object.entries(keywords)) {
    if (words.some(word => lowerSummary.includes(word))) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 3);
}
