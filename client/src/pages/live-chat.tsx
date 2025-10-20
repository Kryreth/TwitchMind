import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMessage } from "@/components/chat-message";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { ChatMessageWithAnalysis } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TwitchStatus {
  connected: boolean;
  channel: string | null;
  messageCount: number;
}

export default function LiveChat() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const { data: messages = [], isLoading } = useQuery<ChatMessageWithAnalysis[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 2000,
  });

  const { data: status, isLoading: statusLoading } = useQuery<TwitchStatus>({
    queryKey: ["/api/twitch/status"],
    refetchInterval: 3000,
  });

  const isConnected = status?.connected ?? false;
  const channelName = status?.channel ?? null;

  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className="h-screen flex flex-col p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="page-title-live-chat">Live Chat</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor your Twitch chat in real-time
            </p>
          </div>
          {statusLoading ? (
            <Badge variant="outline" className="gap-2" data-testid="badge-connection-status">
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
              Checking...
            </Badge>
          ) : isConnected && channelName ? (
            <Badge variant="secondary" className="gap-2" data-testid="badge-connection-status">
              <div className="h-2 w-2 rounded-full bg-chart-2 animate-pulse" />
              Connected to {channelName}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-2" data-testid="badge-connection-status">
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              Not Connected
            </Badge>
          )}
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0" data-testid="card-chat-messages">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-lg font-semibold">Messages</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="space-y-4 w-full p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3 px-4">
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2" data-testid="empty-state-messages">
              <p className="text-sm text-muted-foreground" data-testid="text-no-messages">No messages yet</p>
              {isConnected && channelName ? (
                <p className="text-xs text-muted-foreground" data-testid="text-monitoring-channel">Monitoring {channelName} - messages will appear as they come in</p>
              ) : (
                <p className="text-xs text-muted-foreground" data-testid="text-login-prompt">Log in with Twitch to start monitoring chat</p>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full" ref={scrollAreaRef} onScrollCapture={handleScroll}>
              <div className="space-y-1">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
