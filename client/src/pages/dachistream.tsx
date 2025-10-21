import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  dachiastreamAutoSendToChat: boolean;
  dachipoolEnabled: boolean;
  dachipoolMaxChars: number;
  dachipoolEnergy: string;
  dachipoolMode: string;
  dachipoolShoutoutCooldownHours: number;
  dachipoolElevenlabsEnabled: boolean;
  autoShoutoutsEnabled: boolean;
}

export default function DachiStream() {
  const { toast } = useToast();
  
  // DachiStream settings
  const [topicAllowlist, setTopicAllowlist] = useState<string[]>(["gaming", "anime", "chatting"]);
  const [topicBlocklist, setTopicBlocklist] = useState<string[]>(["politics", "religion"]);
  const [useDatabasePersonalization, setUseDatabasePersonalization] = useState(true);
  const [streamerVoiceOnlyMode, setStreamerVoiceOnlyMode] = useState(false);
  const [dachiastreamSelectionStrategy, setDachiastreamSelectionStrategy] = useState("most_active");
  const [dachiastreamAutoSendToChat, setDachiastreamAutoSendToChat] = useState(false);
  
  // DachiPool settings
  const [dachipoolEnabled, setDachipoolEnabled] = useState(true);
  const [dachipoolMaxChars, setDachipoolMaxChars] = useState([1000]);
  const [dachipoolEnergy, setDachipoolEnergy] = useState("Balanced");
  const [dachipoolMode, setDachipoolMode] = useState("Auto");
  const [dachipoolShoutoutCooldownHours, setDachipoolShoutoutCooldownHours] = useState([24]);
  const [dachipoolElevenlabsEnabled, setDachipoolElevenlabsEnabled] = useState(false);
  const [autoShoutoutsEnabled, setAutoShoutoutsEnabled] = useState(true);

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
      setDachiastreamAutoSendToChat(setting.dachiastreamAutoSendToChat ?? false);
      
      setDachipoolEnabled(setting.dachipoolEnabled ?? true);
      setDachipoolMaxChars([setting.dachipoolMaxChars || 1000]);
      setDachipoolEnergy(setting.dachipoolEnergy || "Balanced");
      setDachipoolMode(setting.dachipoolMode || "Auto");
      setDachipoolShoutoutCooldownHours([setting.dachipoolShoutoutCooldownHours || 24]);
      setDachipoolElevenlabsEnabled(setting.dachipoolElevenlabsEnabled ?? false);
      setAutoShoutoutsEnabled(setting.autoShoutoutsEnabled ?? true);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<Settings>) => {
      if (!settings || settings.length === 0) {
        throw new Error("No settings found");
      }
      return await apiRequest("PATCH", `/api/settings/${settings[0].id}`, newSettings);
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
      dachiastreamAutoSendToChat,
      dachipoolEnabled,
      dachipoolMaxChars: dachipoolMaxChars[0],
      dachipoolEnergy,
      dachipoolMode,
      dachipoolShoutoutCooldownHours: dachipoolShoutoutCooldownHours[0],
      dachipoolElevenlabsEnabled,
      autoShoutoutsEnabled,
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

      <Card data-testid="card-general-config">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">General Configuration</CardTitle>
          <CardDescription>Core AI behavior settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dachipool-enabled">Enable DachiPool</Label>
                  <p className="text-xs text-muted-foreground">
                    Activate enhanced AI features
                  </p>
                </div>
                <Switch
                  id="dachipool-enabled"
                  checked={dachipoolEnabled}
                  onCheckedChange={setDachipoolEnabled}
                  data-testid="switch-dachipool-enabled"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-send-chat">Auto-Send to Chat</Label>
                  <p className="text-xs text-muted-foreground">
                    Send AI responses to Twitch chat
                  </p>
                </div>
                <Switch
                  id="auto-send-chat"
                  checked={dachiastreamAutoSendToChat}
                  onCheckedChange={setDachiastreamAutoSendToChat}
                  data-testid="switch-auto-send-chat"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="energy">Energy Level</Label>
                <Select value={dachipoolEnergy} onValueChange={setDachipoolEnergy}>
                  <SelectTrigger id="energy" data-testid="select-energy">
                    <SelectValue placeholder="Select energy level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Balanced">Balanced</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mode">Mode</Label>
                <Select value={dachipoolMode} onValueChange={setDachipoolMode}>
                  <SelectTrigger id="mode" data-testid="select-mode">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Auto">Auto</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Max Characters</Label>
                  <span className="text-sm text-muted-foreground" data-testid="text-max-chars-value">
                    {dachipoolMaxChars[0]}
                  </span>
                </div>
                <Slider
                  value={dachipoolMaxChars}
                  onValueChange={setDachipoolMaxChars}
                  min={100}
                  max={2000}
                  step={100}
                  data-testid="slider-max-chars"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum length for AI responses
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-shoutouts-tts">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Shoutouts & Text-to-Speech</CardTitle>
          <CardDescription>Configure automatic greetings and voice synthesis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-shoutouts">Auto Shoutouts</Label>
                  <p className="text-xs text-muted-foreground">
                    Greet VIPs automatically
                  </p>
                </div>
                <Switch
                  id="auto-shoutouts"
                  checked={autoShoutoutsEnabled}
                  onCheckedChange={setAutoShoutoutsEnabled}
                  data-testid="switch-auto-shoutouts"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="elevenlabs">ElevenLabs TTS</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable voice synthesis
                  </p>
                </div>
                <Switch
                  id="elevenlabs"
                  checked={dachipoolElevenlabsEnabled}
                  onCheckedChange={setDachipoolElevenlabsEnabled}
                  data-testid="switch-elevenlabs"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Shoutout Cooldown (hours)</Label>
                  <span className="text-sm text-muted-foreground" data-testid="text-cooldown-value">
                    {dachipoolShoutoutCooldownHours[0]}h
                  </span>
                </div>
                <Slider
                  value={dachipoolShoutoutCooldownHours}
                  onValueChange={setDachipoolShoutoutCooldownHours}
                  min={1}
                  max={168}
                  step={1}
                  data-testid="slider-shoutout-cooldown"
                />
                <p className="text-xs text-muted-foreground">
                  Time between automatic greetings for VIPs
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-message-priority">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Message Priority System</CardTitle>
          <CardDescription>Configure which types of messages get priority for AI responses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
              <Badge variant="secondary" className="min-w-12 justify-center">1st</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Moderators & Mods</p>
                <p className="text-xs text-muted-foreground">Highest priority - Staff and channel moderators</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
              <Badge variant="secondary" className="min-w-12 justify-center">2nd</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Raids</p>
                <p className="text-xs text-muted-foreground">Raiding viewers and raid events</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
              <Badge variant="secondary" className="min-w-12 justify-center">3rd</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">VIP Members</p>
                <p className="text-xs text-muted-foreground">Users with VIP badge or artist badge</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
              <Badge variant="secondary" className="min-w-12 justify-center">4th</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Subscribers & Bit Users</p>
                <p className="text-xs text-muted-foreground">Subscription-based or bit-based messages</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
              <Badge variant="secondary" className="min-w-12 justify-center">5th</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Regular Viewers</p>
                <p className="text-xs text-muted-foreground">Standard chat messages and redeems</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-md border border-border">
            <p className="text-sm text-foreground">
              The AI will prioritize responding to messages based on this hierarchy. When multiple messages arrive within the 15-second cycle, higher priority messages are selected first.
            </p>
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
