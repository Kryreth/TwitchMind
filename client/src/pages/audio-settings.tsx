import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Settings } from "@shared/schema";

export default function AudioSettings() {
  const { toast } = useToast();
  
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

  useEffect(() => {
    const settingsArray = Array.isArray(settings) ? settings : [];
    const setting = settingsArray[0];

    if (setting) {
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
    mutationFn: async (data: Partial<Settings>) => {
      const settingsArray = Array.isArray(settings) ? settings : [];
      const settingId = settingsArray[0]?.id;

      if (settingId) {
        const response = await fetch(`/api/settings/${settingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error("Failed to update settings");
        }

        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Audio settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update audio settings.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
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
        <h1 className="text-3xl font-bold mb-2" data-testid="page-title-audio-settings">Audio Settings</h1>
        <p className="text-muted-foreground" data-testid="page-description-audio-settings">
          Configure voice, microphone, and audio features for StreamDachi
        </p>
      </div>

      <Card data-testid="card-voice-settings">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Voice & TTS Settings</CardTitle>
          <CardDescription>Configure AI voice and text-to-speech features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-voice-active">AI Voice Active</Label>
              <p className="text-xs text-muted-foreground">
                Enable AI voice responses using Puter.js TTS
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
            <p className="text-xs text-muted-foreground">
              Select a voice for AI text-to-speech (configured on Monitor page)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Max Voice Length</Label>
              <span className="text-sm text-muted-foreground" data-testid="text-max-voice-length-value">
                {audioMaxVoiceLength[0]} characters
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
        </CardContent>
      </Card>

      <Card data-testid="card-microphone-settings">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Microphone Settings</CardTitle>
          <CardDescription>Configure voice recognition and speech input</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="mic-mode">Mic Mode</Label>
            <Select value={audioMicMode} onValueChange={setAudioMicMode}>
              <SelectTrigger id="mic-mode" data-testid="select-mic-mode">
                <SelectValue placeholder="Select mic mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="muted">Muted</SelectItem>
                <SelectItem value="push-to-talk">Push to Talk</SelectItem>
                <SelectItem value="continuous">Continuous</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Control when the microphone is active (managed on Monitor page)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="speech-cleanup">Speech Cleanup</Label>
              <p className="text-xs text-muted-foreground">
                Automatically clean up and rephrase spoken text with AI
              </p>
            </div>
            <Switch
              id="speech-cleanup"
              checked={audioSpeechCleanup}
              onCheckedChange={setAudioSpeechCleanup}
              data-testid="switch-speech-cleanup"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="fallback-text">Fallback to Text Only</Label>
              <p className="text-xs text-muted-foreground">
                Show text if voice synthesis fails
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
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
          data-testid="button-save-audio-settings"
        >
          {updateSettingsMutation.isPending ? "Saving..." : "Save Audio Settings"}
        </Button>
      </div>
    </div>
  );
}
