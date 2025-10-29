import { useState } from "react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ChatMessage, AiAnalysis, Settings, ModerationAction } from "@shared/schema";
import { 
  ChatBubbleLeftRightIcon, 
  CpuChipIcon, 
  ShieldCheckIcon, 
  UsersIcon 
} from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface TwitchStatus {
  connected: boolean;
  channel: string | null;
  messageCount: number;
}

interface AuthenticatedUser {
  id: string;
  twitchUsername: string;
  twitchDisplayName: string;
  twitchProfileImageUrl: string | null;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("today");
  const [activeDetailModal, setActiveDetailModal] = useState<string | null>(null);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages"],
  });

  const { data: analyses = [], isLoading: analysesLoading } = useQuery<AiAnalysis[]>({
    queryKey: ["/api/analyses"],
  });

  const { data: moderationActions = [], isLoading: moderationActionsLoading } = useQuery<ModerationAction[]>({
    queryKey: ["/api/moderation-actions"],
  });

  const { data: settingsList = [] } = useQuery<Settings[]>({
    queryKey: ["/api/settings"],
  });

  const settings = settingsList[0];

  const { data: twitchStatus } = useQuery<TwitchStatus>({
    queryKey: ["/api/twitch/status"],
    refetchInterval: 3000,
  });

  const { data: authenticatedUser } = useQuery<AuthenticatedUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: elevenLabsUsage } = useQuery<{
    characterCount: number;
    characterLimit: number;
    quotaRemaining: number;
  }>({
    queryKey: ["/api/elevenlabs/usage"],
    refetchInterval: 60000,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!authenticatedUser) {
        throw new Error("Please log in with Twitch first");
      }
      const response = await fetch("/api/twitch/connect", {
        method: "POST",
        body: JSON.stringify({
          channel: authenticatedUser.twitchUsername,
          username: authenticatedUser.twitchUsername,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to connect");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connected!",
        description: "Successfully connected to Twitch chat",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/twitch/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Twitch",
        variant: "destructive",
      });
    },
  });

  const startStreamSessionMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) {
        throw new Error("Settings not loaded");
      }
      return await apiRequest(`/api/settings/${settings.id}`, "PATCH", {
        streamSessionStarted: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Stream session started!",
        description: "New stream session timestamp has been set",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start session",
        description: error.message || "Failed to update stream session",
        variant: "destructive",
      });
    },
  });

  const streamSessionStarted = settings?.streamSessionStarted ? new Date(settings.streamSessionStarted) : null;

  const todayMessages = streamSessionStarted 
    ? messages.filter((m) => new Date(m.timestamp) >= streamSessionStarted)
    : messages;

  const missedMessages = streamSessionStarted 
    ? messages.filter((m) => new Date(m.timestamp) < streamSessionStarted)
    : [];

  const todayAnalyses = streamSessionStarted
    ? analyses.filter((a) => new Date(a.timestamp) >= streamSessionStarted)
    : analyses;

  const missedAnalyses = streamSessionStarted
    ? analyses.filter((a) => new Date(a.timestamp) < streamSessionStarted)
    : [];

  const todayModerationActions = streamSessionStarted
    ? moderationActions.filter((a) => new Date(a.timestamp) >= streamSessionStarted)
    : moderationActions;

  const missedModerationActions = streamSessionStarted
    ? moderationActions.filter((a) => new Date(a.timestamp) < streamSessionStarted)
    : [];

  const currentMessages = activeTab === "today" ? todayMessages : missedMessages;
  const currentAnalyses = activeTab === "today" ? todayAnalyses : missedAnalyses;
  const currentModerationActions = activeTab === "today" ? todayModerationActions : missedModerationActions;

  const totalMessages = currentMessages.length;
  const aiAnalyzed = currentAnalyses.length;
  const uniqueUsers = new Set(currentMessages.map((m) => m.username)).size;
  const moderationActionsCount = currentModerationActions.length;

  const positiveMessages = currentAnalyses.filter((a) => a.sentiment === "positive").length;
  const negativeMessages = currentAnalyses.filter((a) => a.sentiment === "negative").length;

  const sentimentData = [
    { name: "Positive", value: positiveMessages, color: "hsl(var(--chart-2))" },
    { name: "Neutral", value: currentAnalyses.length - positiveMessages - negativeMessages, color: "hsl(var(--chart-3))" },
    { name: "Negative", value: negativeMessages, color: "hsl(var(--destructive))" },
  ];

  const hourlyData = currentMessages.reduce((acc, msg) => {
    const hour = new Date(msg.timestamp).getHours();
    const existing = acc.find((d) => d.hour === hour);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ hour, count: 1 });
    }
    return acc;
  }, [] as { hour: number; count: number }[]).sort((a, b) => a.hour - b.hour);

  const usagePercentage = elevenLabsUsage 
    ? Math.round((elevenLabsUsage.characterCount / elevenLabsUsage.characterLimit) * 100)
    : 0;
  const isNearQuotaLimit = usagePercentage >= 85;

  const recentMessages = [...currentMessages].reverse().slice(0, 20);

  const userMessageCounts = currentMessages.reduce((acc, msg) => {
    acc[msg.username] = (acc[msg.username] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeUsers = Object.entries(userMessageCounts)
    .map(([username, count]) => ({ username, count }))
    .sort((a, b) => b.count - a.count);

  const toxicMessages = currentAnalyses.filter((a) => a.toxicity).length;

  const categoryDistribution = currentAnalyses.reduce((acc, analysis) => {
    const categories = analysis.categories || ["general"];
    categories.forEach(category => {
      acc[category] = (acc[category] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="page-title-dashboard">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time analytics and insights for your Twitch chat
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-dashboard">
        <TabsList data-testid="tabs-list-dashboard">
          <TabsTrigger value="today" data-testid="tab-today">
            Today
          </TabsTrigger>
          <TabsTrigger value="missed" data-testid="tab-missed">
            What You Missed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" data-testid="tab-content-today" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Messages"
              value={totalMessages}
              icon={ChatBubbleLeftRightIcon}
              loading={messagesLoading}
              onClick={() => setActiveDetailModal('messages')}
            />
            <StatCard
              title="AI Analyzed"
              value={aiAnalyzed}
              icon={CpuChipIcon}
              loading={analysesLoading}
              onClick={() => setActiveDetailModal('ai')}
            />
            <StatCard
              title="Active Users"
              value={uniqueUsers}
              icon={UsersIcon}
              loading={messagesLoading}
              onClick={() => setActiveDetailModal('users')}
            />
            <StatCard
              title="Moderation Actions"
              value={moderationActionsCount}
              icon={ShieldCheckIcon}
              loading={moderationActionsLoading}
              onClick={() => setActiveDetailModal('moderation')}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-sentiment-distribution">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Sentiment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {currentAnalyses.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">No analysis data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-4 flex justify-center gap-4">
                  {sentimentData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-hourly-activity">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Hourly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {hourlyData.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">No message data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={hourlyData}>
                      <XAxis
                        dataKey="hour"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="missed" data-testid="tab-content-missed" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Messages"
              value={totalMessages}
              icon={ChatBubbleLeftRightIcon}
              loading={messagesLoading}
              onClick={() => setActiveDetailModal('messages')}
            />
            <StatCard
              title="AI Analyzed"
              value={aiAnalyzed}
              icon={CpuChipIcon}
              loading={analysesLoading}
              onClick={() => setActiveDetailModal('ai')}
            />
            <StatCard
              title="Active Users"
              value={uniqueUsers}
              icon={UsersIcon}
              loading={messagesLoading}
              onClick={() => setActiveDetailModal('users')}
            />
            <StatCard
              title="Moderation Actions"
              value={moderationActionsCount}
              icon={ShieldCheckIcon}
              loading={moderationActionsLoading}
              onClick={() => setActiveDetailModal('moderation')}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-sentiment-distribution">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Sentiment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {currentAnalyses.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">No analysis data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-4 flex justify-center gap-4">
                  {sentimentData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-hourly-activity">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Hourly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {hourlyData.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">No message data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={hourlyData}>
                      <XAxis
                        dataKey="hour"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {authenticatedUser && (
        <Card data-testid="card-twitch-connection">
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg font-semibold">Twitch Connection</CardTitle>
              {twitchStatus?.connected ? (
                <Badge variant="secondary" className="gap-2" data-testid="badge-connected">
                  <div className="h-2 w-2 rounded-full bg-chart-2 animate-pulse" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-2" data-testid="badge-disconnected">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  Disconnected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-sm font-medium">Channel: {authenticatedUser.twitchDisplayName}</p>
                {twitchStatus?.connected ? (
                  <p className="text-xs text-muted-foreground">
                    Monitoring {twitchStatus.channel} - {twitchStatus.messageCount} messages received
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Click connect to start monitoring your chat
                  </p>
                )}
                {streamSessionStarted && (
                  <p className="text-xs text-muted-foreground">
                    Session started: {streamSessionStarted.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!twitchStatus?.connected && (
                  <Button 
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending}
                    data-testid="button-connect-chat"
                  >
                    {connectMutation.isPending ? "Connecting..." : "Connect to Chat"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => startStreamSessionMutation.mutate()}
                  disabled={startStreamSessionMutation.isPending || !settings}
                  data-testid="button-start-stream-session"
                >
                  {startStreamSessionMutation.isPending ? "Starting..." : "Start New Stream Session"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {elevenLabsUsage && (
        <Card data-testid="card-elevenlabs-usage">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">ElevenLabs Voice Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isNearQuotaLimit && (
              <Alert variant="destructive" data-testid="alert-quota-warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Voice quota is {usagePercentage}% full. AI will fall back to text-only responses when quota is exceeded.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Characters Used</span>
                <span className="font-medium" data-testid="text-usage-count">
                  {(elevenLabsUsage.characterCount || 0).toLocaleString()} / {(elevenLabsUsage.characterLimit || 10000).toLocaleString()}
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className={`h-3 ${isNearQuotaLimit ? 'bg-destructive/20' : ''}`}
                data-testid="progress-usage"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{usagePercentage}% used</span>
                <span data-testid="text-remaining-count">
                  {(elevenLabsUsage.quotaRemaining || 10000).toLocaleString()} remaining
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={activeDetailModal === 'messages'} onOpenChange={(open) => !open && setActiveDetailModal(null)}>
        <DialogContent className="max-w-2xl" data-testid="modal-messages">
          <DialogHeader>
            <DialogTitle>Recent Messages</DialogTitle>
            <DialogDescription>
              Last 20 messages from {activeTab === 'today' ? 'today' : 'before your stream session'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3 pr-4">
              {recentMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
              ) : (
                recentMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className="flex flex-col gap-1 p-3 rounded-md bg-muted/50"
                    data-testid={`message-item-${msg.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm" data-testid={`message-username-${msg.id}`}>
                        {msg.username}
                      </span>
                      <span className="text-xs text-muted-foreground" data-testid={`message-timestamp-${msg.id}`}>
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm" data-testid={`message-text-${msg.id}`}>{msg.message}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDetailModal === 'ai'} onOpenChange={(open) => !open && setActiveDetailModal(null)}>
        <DialogContent className="max-w-2xl" data-testid="modal-ai">
          <DialogHeader>
            <DialogTitle>AI Analysis Details</DialogTitle>
            <DialogDescription>
              Sentiment breakdown and analysis statistics for {activeTab === 'today' ? 'today' : 'missed messages'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-6 pr-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Sentiment Breakdown</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-md bg-chart-2/10 border border-chart-2/20">
                    <div className="text-2xl font-bold text-chart-2" data-testid="ai-positive-count">
                      {positiveMessages}
                    </div>
                    <div className="text-xs text-muted-foreground">Positive</div>
                  </div>
                  <div className="p-3 rounded-md bg-chart-3/10 border border-chart-3/20">
                    <div className="text-2xl font-bold" data-testid="ai-neutral-count">
                      {currentAnalyses.length - positiveMessages - negativeMessages}
                    </div>
                    <div className="text-xs text-muted-foreground">Neutral</div>
                  </div>
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <div className="text-2xl font-bold text-destructive" data-testid="ai-negative-count">
                      {negativeMessages}
                    </div>
                    <div className="text-xs text-muted-foreground">Negative</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Toxicity Detection</h3>
                <div className="p-3 rounded-md bg-muted/50">
                  <div className="text-2xl font-bold" data-testid="ai-toxic-count">
                    {toxicMessages}
                  </div>
                  <div className="text-xs text-muted-foreground">Messages flagged as potentially toxic</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Category Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(categoryDistribution).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No category data available</p>
                  ) : (
                    Object.entries(categoryDistribution).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm capitalize">{category}</span>
                        <Badge variant="secondary" data-testid={`category-count-${category}`}>{count}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDetailModal === 'users'} onOpenChange={(open) => !open && setActiveDetailModal(null)}>
        <DialogContent className="max-w-2xl" data-testid="modal-users">
          <DialogHeader>
            <DialogTitle>Active Users</DialogTitle>
            <DialogDescription>
              Users sorted by message count for {activeTab === 'today' ? 'today' : 'missed period'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2 pr-4">
              {activeUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No active users yet</p>
              ) : (
                <div className="space-y-2">
                  {activeUsers.map((user, index) => (
                    <div 
                      key={user.username}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                      data-testid={`user-item-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <span className="font-medium text-sm" data-testid={`user-name-${index}`}>
                          {user.username}
                        </span>
                      </div>
                      <Badge variant="secondary" data-testid={`user-count-${index}`}>
                        {user.count} {user.count === 1 ? 'message' : 'messages'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDetailModal === 'moderation'} onOpenChange={(open) => !open && setActiveDetailModal(null)}>
        <DialogContent className="max-w-2xl" data-testid="modal-moderation">
          <DialogHeader>
            <DialogTitle>Moderation Actions</DialogTitle>
            <DialogDescription>
              All moderation actions for {activeTab === 'today' ? 'today' : 'missed period'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3 pr-4">
              {currentModerationActions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No moderation actions yet</p>
              ) : (
                currentModerationActions.map((action) => (
                  <div 
                    key={action.id}
                    className="p-3 rounded-md bg-muted/50 space-y-2"
                    data-testid={`moderation-item-${action.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" data-testid={`moderation-type-${action.id}`}>
                        {action.actionType}
                      </Badge>
                      <span className="text-xs text-muted-foreground" data-testid={`moderation-timestamp-${action.id}`}>
                        {new Date(action.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-medium" data-testid={`moderation-target-${action.id}`}>
                          {action.targetUsername}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">Moderator:</span>
                        <span data-testid={`moderation-moderator-${action.id}`}>
                          {action.moderatorUsername}
                        </span>
                      </div>
                      {action.reason && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">Reason:</span>
                          <span className="text-xs" data-testid={`moderation-reason-${action.id}`}>
                            {action.reason}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
