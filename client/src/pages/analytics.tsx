import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { ChatMessage, AiAnalysis } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Badge } from "@/components/ui/badge";

export default function Analytics() {
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages"],
  });

  const { data: analyses = [] } = useQuery<AiAnalysis[]>({
    queryKey: ["/api/analyses"],
  });

  const topUsers = messages.reduce((acc, msg) => {
    acc[msg.username] = (acc[msg.username] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topUsersData = Object.entries(topUsers)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([username, count]) => ({ username, count }));

  const sentimentOverTime = analyses.map((analysis, index) => ({
    index,
    score: analysis.sentimentScore,
    sentiment: analysis.sentiment,
  }));

  const avgSentiment = analyses.length > 0
    ? (analyses.reduce((sum, a) => sum + a.sentimentScore, 0) / analyses.length).toFixed(2)
    : "0";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="page-title-analytics">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deep insights into your chat activity and sentiment trends
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-avg-sentiment">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{avgSentiment}</div>
            <p className="text-xs text-muted-foreground mt-1">out of 5.0</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-users">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{Object.keys(topUsers).length}</div>
            <p className="text-xs text-muted-foreground mt-1">unique chatters</p>
          </CardContent>
        </Card>

        <Card data-testid="card-toxicity-rate">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Toxicity Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {analyses.length > 0
                ? `${((analyses.filter((a) => a.toxicity).length / analyses.length) * 100).toFixed(1)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">of analyzed messages</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-top-chatters">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top Chatters</CardTitle>
          </CardHeader>
          <CardContent>
            {topUsersData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-sm text-muted-foreground">No chat data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topUsersData} layout="vertical">
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="username"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-sentiment-trend">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Sentiment Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {sentimentOverTime.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-sm text-muted-foreground">No sentiment data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sentimentOverTime}>
                  <XAxis
                    dataKey="index"
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
                    domain={[1, 5]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-recent-analyses">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent AI Analyses</CardTitle>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">No analyses yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.slice(-5).reverse().map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between p-3 rounded-md bg-card hover-elevate"
                  data-testid={`analysis-${analysis.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        analysis.sentiment === "positive"
                          ? "default"
                          : analysis.sentiment === "negative"
                          ? "destructive"
                          : "secondary"
                      }
                      data-testid={`badge-sentiment-${analysis.id}`}
                    >
                      {analysis.sentiment}
                    </Badge>
                    <span className="text-sm font-mono text-muted-foreground">
                      Score: {analysis.sentimentScore}/5
                    </span>
                  </div>
                  {analysis.toxicity && (
                    <Badge variant="destructive" data-testid={`badge-toxic-${analysis.id}`}>Toxic</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
