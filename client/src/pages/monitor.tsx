import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, MessageSquare, Clock, Zap } from "lucide-react";
import { format } from "date-fns";
import type { ChatMessage } from "@shared/schema";

type DachiStreamStatus = "idle" | "collecting" | "processing" | "selecting_message" | "building_context" | "waiting_for_ai" | "disabled" | "paused";

interface DachiStreamLog {
  timestamp: Date;
  type: "info" | "status" | "message" | "selection" | "ai_response" | "error";
  message: string;
  data?: any;
}

interface DachiStreamState {
  status: DachiStreamStatus;
  bufferCount: number;
  lastCycleTime: Date | null;
  nextCycleTime: Date | null;
  selectedMessage: ChatMessage | null;
  aiResponse: string | null;
  error: string | null;
}

const statusColors: Record<DachiStreamStatus, string> = {
  idle: "bg-gray-500",
  collecting: "bg-blue-500",
  processing: "bg-yellow-500",
  selecting_message: "bg-purple-500",
  building_context: "bg-indigo-500",
  waiting_for_ai: "bg-orange-500",
  disabled: "bg-gray-400",
  paused: "bg-red-500",
};

const statusLabels: Record<DachiStreamStatus, string> = {
  idle: "Idle",
  collecting: "Collecting Messages",
  processing: "Processing Buffer",
  selecting_message: "Selecting Message",
  building_context: "Building Context",
  waiting_for_ai: "Waiting for AI",
  disabled: "Disabled",
  paused: "Paused",
};

const logTypeColors: Record<DachiStreamLog["type"], string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  status: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  message: "bg-green-500/10 text-green-400 border-green-500/20",
  selection: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  ai_response: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function Monitor() {
  const { data: state, isLoading: stateLoading } = useQuery<DachiStreamState>({
    queryKey: ["/api/dachistream/status"],
    refetchInterval: 1000,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<DachiStreamLog[]>({
    queryKey: ["/api/dachistream/logs"],
    refetchInterval: 2000,
  });

  const { data: buffer = [], isLoading: bufferLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/dachistream/buffer"],
    refetchInterval: 1000,
  });

  const aiResponseLogs = logs.filter(log => log.type === "ai_response");

  return (
    <div className="h-full overflow-auto" data-testid="page-monitor">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">DachiStream Monitor</h1>
          <p className="text-muted-foreground">Real-time debugging and monitoring</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card data-testid="card-status">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stateLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : state ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${statusColors[state.status]} animate-pulse`} />
                    <span className="text-2xl font-bold" data-testid="text-status">
                      {statusLabels[state.status]}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {state.lastCycleTime && (
                      <div>Last cycle: {format(new Date(state.lastCycleTime), "HH:mm:ss")}</div>
                    )}
                    {state.nextCycleTime && (
                      <div>Next cycle: {format(new Date(state.nextCycleTime), "HH:mm:ss")}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-buffer">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Buffer</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {bufferLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-2xl font-bold" data-testid="text-buffer-count">
                    {buffer.length} messages
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Waiting for next cycle
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-ai-responses">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Responses</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold" data-testid="text-ai-response-count">
                  {aiResponseLogs.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total generated
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="card-current-buffer">
            <CardHeader>
              <CardTitle>Current Buffer</CardTitle>
              <CardDescription>Messages waiting for processing</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {bufferLoading ? (
                  <div className="text-sm text-muted-foreground">Loading buffer...</div>
                ) : buffer.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Buffer is empty</div>
                ) : (
                  <div className="space-y-2">
                    {buffer.map((msg, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-md bg-card border hover-elevate"
                        data-testid={`buffer-message-${idx}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{msg.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.timestamp), "HH:mm:ss")}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card data-testid="card-event-log">
            <CardHeader>
              <CardTitle>Event Log</CardTitle>
              <CardDescription>Real-time system events</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {logsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading logs...</div>
                ) : logs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No logs yet</div>
                ) : (
                  <div className="space-y-2">
                    {[...logs].reverse().map((log, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-md border ${logTypeColors[log.type]}`}
                        data-testid={`log-entry-${idx}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {log.type}
                          </Badge>
                          <span className="text-xs opacity-70">
                            {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                          </span>
                        </div>
                        <p className="text-sm">{log.message}</p>
                        {log.data && log.type !== "ai_response" && (
                          <pre className="text-xs mt-2 opacity-60 overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-ai-responses-list">
          <CardHeader>
            <CardTitle>AI Response History</CardTitle>
            <CardDescription>All AI-generated responses</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {aiResponseLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No AI responses yet</div>
              ) : (
                <div className="space-y-4">
                  {[...aiResponseLogs].reverse().map((log, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-md bg-card border hover-elevate"
                      data-testid={`ai-response-${idx}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.timestamp), "PPpp")}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {log.data?.fullResponse || log.message}
                      </p>
                      {log.data?.length && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Length: {log.data.length} characters
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
