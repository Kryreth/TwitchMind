import type { ChatMessage, UserProfile } from "@shared/schema";

interface ActiveChatter {
  username: string;
  displayName: string;
  userId: string;
  lastMessageTime: Date;
  messageCount: number;
  isVip: boolean;
  isMod: boolean;
  isSubscriber: boolean;
}

export class ActiveChattersService {
  private chatters: Map<string, ActiveChatter> = new Map();
  private readonly ACTIVE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

  addMessage(message: ChatMessage, userProfile?: UserProfile) {
    const existing = this.chatters.get(message.username.toLowerCase());
    
    if (existing) {
      existing.lastMessageTime = new Date();
      existing.messageCount++;
      if (userProfile) {
        existing.isVip = userProfile.isVip;
        existing.isMod = userProfile.isMod;
        existing.isSubscriber = userProfile.isSubscriber;
      }
    } else {
      this.chatters.set(message.username.toLowerCase(), {
        username: message.username,
        displayName: message.username,
        userId: message.userId || "",
        lastMessageTime: new Date(),
        messageCount: 1,
        isVip: userProfile?.isVip || false,
        isMod: userProfile?.isMod || false,
        isSubscriber: userProfile?.isSubscriber || false,
      });
    }
  }

  getActiveChatters(): ActiveChatter[] {
    this.cleanupInactive();
    return Array.from(this.chatters.values())
      .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
  }

  searchChatters(query: string): ActiveChatter[] {
    this.cleanupInactive();
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.chatters.values())
      .filter(chatter => 
        chatter.username.toLowerCase().includes(lowerQuery) ||
        chatter.displayName.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime())
      .slice(0, 10);
  }

  private cleanupInactive() {
    const now = Date.now();
    const toRemove: string[] = [];
    
    for (const [key, chatter] of Array.from(this.chatters.entries())) {
      if (now - chatter.lastMessageTime.getTime() > this.ACTIVE_WINDOW_MS) {
        toRemove.push(key);
      }
    }
    
    toRemove.forEach(key => this.chatters.delete(key));
  }

  clear() {
    this.chatters.clear();
  }

  getCount(): number {
    this.cleanupInactive();
    return this.chatters.size;
  }
}
