import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Settings, InsertSettings, AuthenticatedUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [twitchChannel, setTwitchChannel] = useState("");
  const [twitchUsername, setTwitchUsername] = useState("");
  const [autoModeration, setAutoModeration] = useState(false);
  const [sentimentThreshold, setSentimentThreshold] = useState([3]);
  const [enableAiAnalysis, setEnableAiAnalysis] = useState(true);
  
  const [audioMicMode, setAudioMicMode] = useState("muted");
  const [audioVoiceSelection, setAudioVoiceSelection] = useState("Default");
  const [audioAiVoiceActive, setAudioAiVoiceActive] = useState(true);
  const [audioSpeechCleanup, setAudioSpeechCleanup] = useState(true);
  const [audioFallbackToTextOnly, setAudioFallbackToTextOnly] = useState(true);
  const [audioCooldownBetweenReplies, setAudioCooldownBetweenReplies] = useState([5]);
  const [audioMaxVoiceLength, setAudioMaxVoiceLength] = useState([500]);

  const { data: settings } = useQuery<Settings[]>({
    queryKey: ["/api/settings"],
  });

  const { data: authenticatedUser } = useQuery<AuthenticatedUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (settings && settings.length > 0) {
      const setting = settings[0];
      setTwitchChannel(setting.twitchChannel || "");
      setTwitchUsername(setting.twitchUsername || "");
      setAutoModeration(setting.autoModeration);
      setSentimentThreshold([setting.sentimentThreshold]);
      setEnableAiAnalysis(setting.enableAiAnalysis);
      
      setAudioMicMode(setting.audioMicMode || "muted");
      setAudioVoiceSelection(setting.audioVoiceSelection || "Default");
      setAudioAiVoiceActive(setting.audioAiVoiceActive ?? true);
      setAudioSpeechCleanup(setting.audioSpeechCleanup ?? true);
      setAudioFallbackToTextOnly(setting.audioFallbackToTextOnly ?? true);
      setAudioCooldownBetweenReplies([setting.audioCooldownBetweenReplies || 5]);
      setAudioMaxVoiceLength([setting.audioMaxVoiceLength || 500]);
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
      audioMicMode,
      audioVoiceSelection,
      audioAiVoiceActive,
      audioSpeechCleanup,
      audioFallbackToTextOnly,
      audioCooldownBetweenReplies: audioCooldownBetweenReplies[0],
      audioMaxVoiceLength: audioMaxVoiceLength[0],
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
            {authenticatedUser ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-md">
                  <Avatar data-testid="avatar-user">
                    <AvatarImage src={authenticatedUser.twitchProfileImageUrl || undefined} />
                    <AvatarFallback>{authenticatedUser.twitchDisplayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground" data-testid="text-display-name">
                      {authenticatedUser.twitchDisplayName}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid="text-username">
                      @{authenticatedUser.twitchUsername}
                    </p>
                    {authenticatedUser.twitchEmail && (
                      <p className="text-xs text-muted-foreground" data-testid="text-email">
                        {authenticatedUser.twitchEmail}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connected via Twitch OAuth. Your channel is automatically configured.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  <Button
                    onClick={() => window.location.href = "/api/auth/twitch"}
                    data-testid="button-login-twitch"
                    className="w-full"
                  >
                    Login with Twitch
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Recommended: Login with Twitch for automatic configuration
                  </p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or configure manually
                    </span>
                  </div>
                </div>
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
              </>
            )}
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
