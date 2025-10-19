import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { ChatMessageWithAnalysis } from "@shared/schema";

interface ChatMessageProps {
  message: ChatMessageWithAnalysis;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const getSentimentColor = (sentiment?: string) => {
    if (!sentiment) return "";
    switch (sentiment) {
      case "positive":
        return "border-l-chart-2";
      case "negative":
        return "border-l-destructive";
      default:
        return "border-l-chart-3";
    }
  };

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-2 hover-elevate ${
        message.analysis ? `border-l-2 ${getSentimentColor(message.analysis.sentiment)}` : ""
      }`}
      data-testid={`chat-message-${message.id}`}
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {getUserInitials(message.username)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: message.userColor || "hsl(var(--primary))" }}
            data-testid={`message-username-${message.id}`}
          >
            {message.username}
          </span>
          <span className="text-xs font-mono text-muted-foreground" data-testid={`message-timestamp-${message.id}`}>
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
          {message.analysis && (
            <Badge variant="secondary" className="text-xs" data-testid={`message-sentiment-${message.id}`}>
              {message.analysis.sentiment}
            </Badge>
          )}
        </div>
        <p className="text-sm text-foreground mt-1 break-words" data-testid={`message-text-${message.id}`}>
          {message.message}
        </p>
      </div>
    </div>
  );
}
