import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import type { ChatMessage, AiAnalysis } from "@shared/schema";
import { 
  ChatBubbleLeftRightIcon, 
  CpuChipIcon, 
  ShieldCheckIcon, 
  UsersIcon 
} from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages"],
  });

  const { data: analyses = [], isLoading: analysesLoading } = useQuery<AiAnalysis[]>({
    queryKey: ["/api/analyses"],
  });

  const { data: elevenLabsUsage } = useQuery<{
    characterCount: number;
    characterLimit: number;
    quotaRemaining: number;
  }>({
    queryKey: ["/api/elevenlabs/usage"],
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  const totalMessages = messages.length;
  const aiAnalyzed = analyses.length;
  const positiveMessages = analyses.filter((a) => a.sentiment === "positive").length;
  const negativeMessages = analyses.filter((a) => a.sentiment === "negative").length;
  const toxicMessages = analyses.filter((a) => a.toxicity).length;

  const uniqueUsers = new Set(messages.map((m) => m.username)).size;

  const sentimentData = [
    { name: "Positive", value: positiveMessages, color: "hsl(var(--chart-2))" },
    { name: "Neutral", value: analyses.length - positiveMessages - negativeMessages, color: "hsl(var(--chart-3))" },
    { name: "Negative", value: negativeMessages, color: "hsl(var(--destructive))" },
  ];

  const hourlyData = messages.reduce((acc, msg) => {
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Messages"
          value={totalMessages}
          icon={ChatBubbleLeftRightIcon}
          loading={messagesLoading}
        />
        <StatCard
          title="AI Analyzed"
          value={aiAnalyzed}
          icon={CpuChipIcon}
          loading={analysesLoading}
        />
        <StatCard
          title="Active Users"
          value={uniqueUsers}
          icon={UsersIcon}
          loading={messagesLoading}
        />
        <StatCard
          title="Moderation Actions"
          value={toxicMessages}
          icon={ShieldCheckIcon}
          loading={analysesLoading}
        />
      </div>

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
                  {elevenLabsUsage.characterCount.toLocaleString()} / {elevenLabsUsage.characterLimit.toLocaleString()}
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
                  {elevenLabsUsage.quotaRemaining.toLocaleString()} remaining
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-sentiment-distribution">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Sentiment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {analyses.length === 0 ? (
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
    </div>
  );
}
