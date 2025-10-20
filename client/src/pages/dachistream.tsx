import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Settings {
  id: number;
  twitchChannel: string;
  autoModeration: boolean;
  sentimentThreshold: number;
  topicAllowlist: string[];
  topicBlocklist: string[];
  useDatabasePersonalization: boolean;
  streamerVoiceOnlyMode: boolean;
  dachiastreamSelectionStrategy: string;
}

export default function DachiStream() {
  const { toast } = useToast();
  
  const [topicAllowlist, setTopicAllowlist] = useState<string[]>(["gaming", "anime", "chatting"]);
  const [topicBlocklist, setTopicBlocklist] = useState<string[]>(["politics", "religion"]);
  const [useDatabasePersonalization, setUseDatabasePersonalization] = useState(true);
  const [streamerVoiceOnlyMode, setStreamerVoiceOnlyMode] = useState(false);
  const [dachiastreamSelectionStrategy, setDachiastreamSelectionStrategy] = useState("most_active");

  const { data: settings } = useQuery<Settings[]>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings && settings.length > 0) {
      const setting = settings[0];
      setTopicAllowlist(setting.topicAllowlist || ["gaming", "anime", "chatting"]);
      setTopicBlocklist(setting.topicBlocklist || ["politics", "religion"]);
      setUseDatabasePersonalization(setting.useDatabasePersonalization ?? true);
      setStreamerVoiceOnlyMode(setting.streamerVoiceOnlyMode ?? false);
      setDachiastreamSelectionStrategy(setting.dachiastreamSelectionStrategy || "most_active");
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<Settings>) => {
      return await apiRequest("PATCH", "/api/settings", newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "DachiStream settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({
      topicAllowlist,
      topicBlocklist,
      useDatabasePersonalization,
      streamerVoiceOnlyMode,
      dachiastreamSelectionStrategy,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">DachiStream</h1>
        <p className="text-muted-foreground mt-2">
          Configure how the AI interacts with your Twitch chat stream
        </p>
      </div>

      <Card data-testid="card-dachistream-controls">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Message Selection</CardTitle>
          <CardDescription>Configure how the AI chooses which messages to respond to</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="selection-strategy">Selection Strategy</Label>
            <Select value={dachiastreamSelectionStrategy} onValueChange={setDachiastreamSelectionStrategy}>
              <SelectTrigger id="selection-strategy" data-testid="select-selection-strategy">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most_active">Most Active</SelectItem>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="new_chatter">New Chatter</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How the AI chooses which messages to respond to
            </p>
          </div>

          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm text-foreground">
              DachiStream operates on a 15-second cycle, analyzing chat activity and selecting messages based on your chosen strategy. The AI will engage naturally while respecting cooldowns and topic filters.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-response-modes">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Response Modes</CardTitle>
          <CardDescription>Control who the AI responds to and how it learns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="database-personalization">Database Personalization</Label>
                <p className="text-xs text-muted-foreground">
                  Use AI-learned user personalities
                </p>
              </div>
              <Switch
                id="database-personalization"
                checked={useDatabasePersonalization}
                onCheckedChange={setUseDatabasePersonalization}
                data-testid="switch-database-personalization"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="streamer-voice-only">Streamer Voice-Only Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Only respond to streamer messages
                </p>
              </div>
              <Switch
                id="streamer-voice-only"
                checked={streamerVoiceOnlyMode}
                onCheckedChange={setStreamerVoiceOnlyMode}
                data-testid="switch-streamer-voice-only"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-topic-filters">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Topic Filters</CardTitle>
          <CardDescription>Control what topics the AI can discuss</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Allowed Topics</Label>
              <div className="text-sm text-foreground p-3 bg-muted rounded-md" data-testid="text-allowed-topics">
                {topicAllowlist.join(", ")}
              </div>
              <p className="text-xs text-muted-foreground">
                Topics the AI can engage with
              </p>
            </div>

            <div className="space-y-2">
              <Label>Blocked Topics</Label>
              <div className="text-sm text-foreground p-3 bg-muted rounded-md" data-testid="text-blocked-topics">
                {topicBlocklist.join(", ")}
              </div>
              <p className="text-xs text-muted-foreground">
                Topics the AI will avoid
              </p>
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
