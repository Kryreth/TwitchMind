import { useState } from "react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      if (!settings?.id) {
        throw new Error("Settings not loaded");
      }
      return await apiRequest(`/api/settings/${settings.id}`, "PATCH", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const handleToggleVisibility = (field: keyof Settings, value: boolean) => {
    updateSettingsMutation.mutate({ [field]: value });
  };

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
              showToggle
              isVisible={settings?.dashboardShowTotalMessages ?? true}
              onToggleVisibility={(value) => handleToggleVisibility("dashboardShowTotalMessages", value)}
            />
            <StatCard
              title="AI Analyzed"
              value={aiAnalyzed}
              icon={CpuChipIcon}
              loading={analysesLoading}
              showToggle
              isVisible={settings?.dashboardShowAiAnalyzed ?? true}
              onToggleVisibility={(value) => handleToggleVisibility("dashboardShowAiAnalyzed", value)}
            />
            <StatCard
              title="Active Users"
              value={uniqueUsers}
              icon={UsersIcon}
              loading={messagesLoading}
              showToggle
              isVisible={settings?.dashboardShowActiveUsers ?? true}
              onToggleVisibility={(value) => handleToggleVisibility("dashboardShowActiveUsers", value)}
            />
            <StatCard
              title="Moderation Actions"
              value={moderationActionsCount}
              icon={ShieldCheckIcon}
              loading={moderationActionsLoading}
              showToggle
              isVisible={settings?.dashboardShowModActions ?? true}
              onToggleVisibility={(value) => handleToggleVisibility("dashboardShowModActions", value)}
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
              showToggle
              isVisible={settings?.dashboardShowTotalMessages ?? true}
              onToggleVisibility={(value) => handleToggleVisibility("dashboardShowTotalMessages", value)}
            />
            <StatCard
              title="AI Analyzed"
              value={aiAnalyzed}
              icon={CpuChipIcon}
              loading={analysesLoading}
              showToggle
              isVisible={settings?.dashboardShowAiAnalyzed ?? true}
              onToggleVisibility={(value) => handleToggleVisibility("dashboardShowAiAnalyzed", value)}
            />
            <StatCard
              title="Active Users"
              value={uniqueUsers}
              icon={UsersIcon}
              loading={messagesLoading}
              showToggle
              isVisible={settings?.dashboardShowActiveUsers ?? true}
              onToggleVisibility={(value) => handleToggleVisibility("dashboardShowActiveUsers", value)}
            />
            <StatCard
              title="Moderation Actions"
              value={moderationActionsCount}
              icon={ShieldCheckIcon}
              loading={moderationActionsLoading}
              showToggle
              isVisible={settings?.dashboardShowModActions ?? true}
              onToggleVisibility={(value) => handleToggleVisibility("dashboardShowModActions", value)}
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
    </div>
  );
}
