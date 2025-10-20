import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  
  const [dachipoolEnabled, setDachipoolEnabled] = useState(true);
  const [dachipoolMaxChars, setDachipoolMaxChars] = useState([1000]);
  const [dachipoolEnergy, setDachipoolEnergy] = useState("Balanced");
  const [dachipoolMode, setDachipoolMode] = useState("Auto");
  const [dachipoolShoutoutCooldownHours, setDachipoolShoutoutCooldownHours] = useState([24]);
  const [dachipoolOpenaiModel, setDachipoolOpenaiModel] = useState("gpt-4o-mini");
  const [dachipoolOpenaiTemp, setDachipoolOpenaiTemp] = useState([7]);
  const [dachipoolElevenlabsEnabled, setDachipoolElevenlabsEnabled] = useState(false);
  const [dachipoolElevenlabsVoice, setDachipoolElevenlabsVoice] = useState("Default");
  const [autoShoutoutsEnabled, setAutoShoutoutsEnabled] = useState(true);
  
  const [audioMicMode, setAudioMicMode] = useState("muted");
  const [audioVoiceSelection, setAudioVoiceSelection] = useState("Default");
  const [audioAiVoiceActive, setAudioAiVoiceActive] = useState(true);
  const [audioSpeechCleanup, setAudioSpeechCleanup] = useState(true);
  const [audioFallbackToTextOnly, setAudioFallbackToTextOnly] = useState(true);
  const [audioCooldownBetweenReplies, setAudioCooldownBetweenReplies] = useState([5]);
  const [audioMaxVoiceLength, setAudioMaxVoiceLength] = useState([500]);
  
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
      setTwitchChannel(setting.twitchChannel || "");
      setTwitchUsername(setting.twitchUsername || "");
      setAutoModeration(setting.autoModeration);
      setSentimentThreshold([setting.sentimentThreshold]);
      setEnableAiAnalysis(setting.enableAiAnalysis);
      
      setDachipoolEnabled(setting.dachipoolEnabled ?? true);
      setDachipoolMaxChars([setting.dachipoolMaxChars || 1000]);
      setDachipoolEnergy(setting.dachipoolEnergy || "Balanced");
      setDachipoolMode(setting.dachipoolMode || "Auto");
      setDachipoolShoutoutCooldownHours([setting.dachipoolShoutoutCooldownHours || 24]);
      setDachipoolOpenaiModel(setting.dachipoolOpenaiModel || "gpt-4o-mini");
      setDachipoolOpenaiTemp([setting.dachipoolOpenaiTemp || 7]);
      setDachipoolElevenlabsEnabled(setting.dachipoolElevenlabsEnabled ?? false);
      setDachipoolElevenlabsVoice(setting.dachipoolElevenlabsVoice || "Default");
      setAutoShoutoutsEnabled(setting.autoShoutoutsEnabled ?? true);
      
      setAudioMicMode(setting.audioMicMode || "muted");
      setAudioVoiceSelection(setting.audioVoiceSelection || "Default");
      setAudioAiVoiceActive(setting.audioAiVoiceActive ?? true);
      setAudioSpeechCleanup(setting.audioSpeechCleanup ?? true);
      setAudioFallbackToTextOnly(setting.audioFallbackToTextOnly ?? true);
      setAudioCooldownBetweenReplies([setting.audioCooldownBetweenReplies || 5]);
      setAudioMaxVoiceLength([setting.audioMaxVoiceLength || 500]);
      
      setTopicAllowlist(setting.topicAllowlist || ["gaming", "anime", "chatting"]);
      setTopicBlocklist(setting.topicBlocklist || ["politics", "religion"]);
      setUseDatabasePersonalization(setting.useDatabasePersonalization ?? true);
      setStreamerVoiceOnlyMode(setting.streamerVoiceOnlyMode ?? false);
      
      setDachiastreamSelectionStrategy(setting.dachiastreamSelectionStrategy || "most_active");
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
      dachipoolEnabled,
      dachipoolMaxChars: dachipoolMaxChars[0],
      dachipoolEnergy,
      dachipoolMode,
      dachipoolShoutoutCooldownHours: dachipoolShoutoutCooldownHours[0],
      dachipoolOpenaiModel,
      dachipoolOpenaiTemp: dachipoolOpenaiTemp[0],
      dachipoolElevenlabsEnabled,
      dachipoolElevenlabsVoice,
      autoShoutoutsEnabled,
      audioMicMode,
      audioVoiceSelection,
      audioAiVoiceActive,
      audioSpeechCleanup,
      audioFallbackToTextOnly,
      audioCooldownBetweenReplies: audioCooldownBetweenReplies[0],
      audioMaxVoiceLength: audioMaxVoiceLength[0],
      topicAllowlist,
      topicBlocklist,
      useDatabasePersonalization,
      streamerVoiceOnlyMode,
      dachiastreamSelectionStrategy,
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

      <Card data-testid="card-dachipool-settings">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">DachiPool Configuration</CardTitle>
          <CardDescription>Customize AI behavior and shoutout settings</CardDescription>
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
              </div>

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
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>OpenAI Temperature</Label>
                  <span className="text-sm text-muted-foreground" data-testid="text-temp-value">
                    {(dachipoolOpenaiTemp[0] / 10).toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={dachipoolOpenaiTemp}
                  onValueChange={setDachipoolOpenaiTemp}
                  min={0}
                  max={10}
                  step={1}
                  data-testid="slider-openai-temp"
                />
                <p className="text-xs text-muted-foreground">
                  Higher values make AI more creative
                </p>
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
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-audio-settings">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Audio Settings</CardTitle>
          <CardDescription>Configure voice and audio features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ai-voice-active">AI Voice Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable AI voice responses
                  </p>
                </div>
                <Switch
                  id="ai-voice-active"
                  checked={audioAiVoiceActive}
                  onCheckedChange={setAudioAiVoiceActive}
                  data-testid="switch-ai-voice-active"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-selection">Voice Selection</Label>
                <Select value={audioVoiceSelection} onValueChange={setAudioVoiceSelection}>
                  <SelectTrigger id="voice-selection" data-testid="select-voice-selection">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Default">Default</SelectItem>
                    <SelectItem value="Voice 1">Voice 1</SelectItem>
                    <SelectItem value="Voice 2">Voice 2</SelectItem>
                    <SelectItem value="Voice 3">Voice 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mic-mode">Mic Mode</Label>
                <Select value={audioMicMode} onValueChange={setAudioMicMode}>
                  <SelectTrigger id="mic-mode" data-testid="select-mic-mode">
                    <SelectValue placeholder="Select mic mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="muted">Muted</SelectItem>
                    <SelectItem value="passthrough">Passthrough</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="speech-cleanup">Speech Cleanup</Label>
                  <p className="text-xs text-muted-foreground">
                    Clean up spoken text with AI
                  </p>
                </div>
                <Switch
                  id="speech-cleanup"
                  checked={audioSpeechCleanup}
                  onCheckedChange={setAudioSpeechCleanup}
                  data-testid="switch-speech-cleanup"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="fallback-text">Fallback to Text Only</Label>
                  <p className="text-xs text-muted-foreground">
                    Use text when quota exceeded
                  </p>
                </div>
                <Switch
                  id="fallback-text"
                  checked={audioFallbackToTextOnly}
                  onCheckedChange={setAudioFallbackToTextOnly}
                  data-testid="switch-fallback-text"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Cooldown Between Replies</Label>
                  <span className="text-sm text-muted-foreground" data-testid="text-cooldown-replies-value">
                    {audioCooldownBetweenReplies[0]}s
                  </span>
                </div>
                <Slider
                  value={audioCooldownBetweenReplies}
                  onValueChange={setAudioCooldownBetweenReplies}
                  min={1}
                  max={30}
                  step={1}
                  data-testid="slider-cooldown-replies"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum seconds between voice replies
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Max Voice Length</Label>
                  <span className="text-sm text-muted-foreground" data-testid="text-max-voice-length-value">
                    {audioMaxVoiceLength[0]}
                  </span>
                </div>
                <Slider
                  value={audioMaxVoiceLength}
                  onValueChange={setAudioMaxVoiceLength}
                  min={100}
                  max={1000}
                  step={50}
                  data-testid="slider-max-voice-length"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum characters for voice synthesis
                </p>
              </div>
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
            <div className="space-y-6">
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

            <div className="space-y-6">
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
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-dachiastream-controls">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">DachiStream Controls</CardTitle>
          <CardDescription>Configure how the AI selects messages to respond to</CardDescription>
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
