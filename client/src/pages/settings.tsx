import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Settings, InsertSettings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [twitchChannel, setTwitchChannel] = useState("");
  const [twitchUsername, setTwitchUsername] = useState("");
  const [autoModeration, setAutoModeration] = useState(false);
  const [sentimentThreshold, setSentimentThreshold] = useState([3]);
  const [enableAiAnalysis, setEnableAiAnalysis] = useState(true);

  const { data: settings } = useQuery<Settings[]>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings && settings.length > 0) {
      const setting = settings[0];
      setTwitchChannel(setting.twitchChannel || "");
      setTwitchUsername(setting.twitchUsername || "");
      setAutoModeration(setting.autoModeration);
      setSentimentThreshold([setting.sentimentThreshold]);
      setEnableAiAnalysis(setting.enableAiAnalysis);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: InsertSettings) => 
      settings && settings.length > 0
        ? apiRequest("PATCH", `/api/settings/${settings[0].id}`, data)
        : apiRequest("POST", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({
      twitchChannel,
      twitchUsername,
      autoModeration,
      sentimentThreshold: sentimentThreshold[0],
      enableAiAnalysis,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="page-title-settings">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your Twitch integration and AI features
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-twitch-config">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Twitch Configuration</CardTitle>
            <CardDescription>Connect to your Twitch channel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="channel">Channel Name</Label>
              <Input
                id="channel"
                value={twitchChannel}
                onChange={(e) => setTwitchChannel(e.target.value)}
                placeholder="Enter channel name"
                data-testid="input-channel"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The Twitch channel to monitor
              </p>
            </div>
            <div>
              <Label htmlFor="username">Bot Username</Label>
              <Input
                id="username"
                value={twitchUsername}
                onChange={(e) => setTwitchUsername(e.target.value)}
                placeholder="Enter bot username"
                data-testid="input-username"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Username for the chat bot (can be your own)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-ai-settings">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">AI Settings</CardTitle>
            <CardDescription>Configure AI analysis and moderation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-analysis">Enable AI Analysis</Label>
                <p className="text-xs text-muted-foreground">
                  Analyze messages with OpenAI
                </p>
              </div>
              <Switch
                id="ai-analysis"
                checked={enableAiAnalysis}
                onCheckedChange={setEnableAiAnalysis}
                data-testid="switch-ai-analysis"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-mod">Auto Moderation</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically flag toxic messages
                </p>
              </div>
              <Switch
                id="auto-mod"
                checked={autoModeration}
                onCheckedChange={setAutoModeration}
                data-testid="switch-auto-moderation"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Sentiment Threshold</Label>
                <span className="text-sm text-muted-foreground" data-testid="text-threshold-value">
                  {sentimentThreshold[0]}
                </span>
              </div>
              <Slider
                value={sentimentThreshold}
                onValueChange={setSentimentThreshold}
                min={1}
                max={5}
                step={1}
                data-testid="slider-sentiment-threshold"
              />
              <p className="text-xs text-muted-foreground">
                Minimum sentiment score for positive classification
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-connection-status">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-2" />
              <span className="text-sm text-foreground">Twitch: Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-2" />
              <span className="text-sm text-foreground">OpenAI: Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-2" />
              <span className="text-sm text-foreground">Database: Active</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          data-testid="button-save-settings"
        >
          {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
