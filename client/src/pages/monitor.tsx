import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Activity, MessageSquare, Clock, Zap, Mic, MicOff, Volume2, VolumeX, Play, Pause, Rocket, ExternalLink, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import type { ChatMessage } from "@shared/schema";

type DachiStreamStatus = "idle" | "collecting" | "processing" | "selecting_message" | "building_context" | "waiting_for_ai" | "disabled" | "paused";

interface DachiStreamLog {
  timestamp: Date;
  type: "info" | "status" | "message" | "selection" | "ai_response" | "error";
  message: string;
  data?: any;
}

interface DachiStreamState {
  status: DachiStreamStatus;
  bufferCount: number;
  lastCycleTime: Date | null;
  nextCycleTime: Date | null;
  secondsUntilNextCycle: number;
  selectedMessage: ChatMessage | null;
  aiResponse: string | null;
  error: string | null;
}

interface VIPStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
}

const statusColors: Record<DachiStreamStatus, string> = {
  idle: "bg-gray-500",
  collecting: "bg-blue-500",
  processing: "bg-yellow-500",
  selecting_message: "bg-purple-500",
  building_context: "bg-indigo-500",
  waiting_for_ai: "bg-orange-500",
  disabled: "bg-gray-400",
  paused: "bg-red-500",
};

const statusLabels: Record<DachiStreamStatus, string> = {
  idle: "Idle",
  collecting: "Collecting Messages",
  processing: "Processing Buffer",
  selecting_message: "Selecting Message",
  building_context: "Building Context",
  waiting_for_ai: "Waiting for AI",
  disabled: "Disabled",
  paused: "Paused",
};

const logTypeColors: Record<DachiStreamLog["type"], string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  status: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  message: "bg-green-500/10 text-green-400 border-green-500/20",
  selection: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  ai_response: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function Monitor() {
  const { toast } = useToast();
  const [selectedStream, setSelectedStream] = useState<VIPStream | null>(null);
  const [streamMuted, setStreamMuted] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [dachipoolPaused, setDachipoolPaused] = useState(false);

  const tts = useTextToSpeech();

  const {
    isListening,
    transcript,
    enhancedText,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: voiceSupported,
    isEnhancing,
  } = useVoiceRecognition({
    onEnhanced: (original, enhanced) => {
      toast({
        title: "Text Rephrased!",
        description: `"${enhanced}"`,
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Voice Error",
        description: error,
      });
    },
    autoEnhance: true,
    continuous: true,
  });

  // Fetch TTS settings from database
  const { data: settings } = useQuery<any[]>({
    queryKey: ["/api/settings"],
  });

  // Listen for VIP shoutout events and trigger TTS
  useEffect(() => {
    const handleShoutout = (event: any) => {
      const { username, message } = event.detail;
      
      // Check if TTS is enabled in settings
      const settingsData = settings?.[0];
      if (settingsData?.ttsEnabled && tts.isSupported) {
        console.log("Speaking shoutout for", username);
        
        // Configure TTS with saved settings
        tts.updateSettings({
          enabled: true,
          voice: settingsData.ttsVoice,
          pitch: (settingsData.ttsPitch || 10) / 10,
          rate: (settingsData.ttsRate || 10) / 10,
          volume: (settingsData.ttsVolume || 10) / 10,
        });
        
        // Speak the shoutout message
        tts.speak(message);
        
        // Show toast notification
        toast({
          title: "VIP Shoutout!",
          description: message,
          duration: 5000,
        });
      }
    };

    window.addEventListener("vip_shoutout", handleShoutout);
    return () => window.removeEventListener("vip_shoutout", handleShoutout);
  }, [settings, tts, toast]);

  // Auto-pause DachiPool when speaking
  useEffect(() => {
    if (isListening && !dachipoolPaused) {
      setDachipoolPaused(true);
    }
  }, [isListening, dachipoolPaused]);

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const { data: state, isLoading: stateLoading } = useQuery<DachiStreamState>({
    queryKey: ["/api/dachistream/status"],
    refetchInterval: 1000,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<DachiStreamLog[]>({
    queryKey: ["/api/dachistream/logs"],
    refetchInterval: 2000,
  });

  const { data: buffer = [], isLoading: bufferLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/dachistream/buffer"],
    refetchInterval: 1000,
  });

  const { data: vipStreams = [], isLoading: vipStreamsLoading } = useQuery<VIPStream[]>({
    queryKey: ["/api/users/vips/streams"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const aiResponseLogs = logs.filter(log => log.type === "ai_response");

  const handleRaid = async (stream: VIPStream) => {
    try {
      await apiRequest("POST", "/api/raids/start", { toUsername: stream.user_login });

      toast({
        title: "Raid Started!",
        description: `Raiding ${stream.user_name} with your viewers!`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/raids"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Raid Failed",
        description: error.message || "Failed to start raid",
      });
    }
  };

  const getStreamEmbedUrl = (stream: VIPStream) => {
    return `https://player.twitch.tv/?channel=${stream.user_login}&parent=${window.location.hostname}&muted=${streamMuted}`;
  };

  return (
    <div className="h-full overflow-auto" data-testid="page-monitor">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">DachiStream Monitor</h1>
          <p className="text-muted-foreground">Real-time debugging and monitoring</p>
        </div>

        {/* Voice & DachiPool Controls */}
        <Card data-testid="card-voice-controls">
          <CardHeader>
            <CardTitle>DachiStream Controls</CardTitle>
            <CardDescription>
              {voiceSupported 
                ? "Voice-to-text with AI rephrasing - Pauses DachiStream while you speak"
                : "Voice recognition not supported in this browser"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <Button
                variant={isListening ? "default" : "outline"}
                size="default"
                onClick={toggleMic}
                disabled={!voiceSupported}
                data-testid="button-toggle-mic"
                className="min-w-[140px]"
              >
                {isListening ? (
                  <>
                    <Mic className="h-4 w-4 mr-2 animate-pulse" />
                    Listening...
                  </>
                ) : (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Start Speaking
                  </>
                )}
              </Button>

              <div className="flex items-center space-x-2">
                <Switch
                  id="tts-enabled"
                  checked={ttsEnabled}
                  onCheckedChange={setTtsEnabled}
                  data-testid="toggle-tts"
                />
                <Label htmlFor="tts-enabled" className="flex items-center gap-2 cursor-pointer">
                  {ttsEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                  <span>TTS AI {ttsEnabled ? "On" : "Off"}</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="dachipool-pause"
                  checked={dachipoolPaused}
                  onCheckedChange={setDachipoolPaused}
                  data-testid="toggle-dachipool"
                />
                <Label htmlFor="dachipool-pause" className="flex items-center gap-2 cursor-pointer">
                  {dachipoolPaused ? <Pause className="h-4 w-4 text-muted-foreground" /> : <Play className="h-4 w-4 text-primary" />}
                  <span>DachiPool {dachipoolPaused ? "Paused" : "Active"}</span>
                </Label>
              </div>
            </div>

            {/* Voice Transcription Display */}
            {(transcript || enhancedText) && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                {transcript && (
                  <div>
                    <Label className="text-xs text-muted-foreground">What You Said:</Label>
                    <Textarea
                      value={transcript}
                      readOnly
                      className="mt-1 min-h-[60px] resize-none"
                      data-testid="text-transcript"
                    />
                  </div>
                )}
                {isEnhancing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI is rephrasing (5 sec after you stop speaking)...</span>
                  </div>
                )}
                {enhancedText && (
                  <div>
                    <Label className="text-xs text-muted-foreground">AI Rephrased (Same Meaning, Different Words):</Label>
                    <Textarea
                      value={enhancedText}
                      readOnly
                      className="mt-1 min-h-[60px] resize-none bg-primary/10 border-primary/20"
                      data-testid="text-enhanced"
                    />
                  </div>
                )}
                {enhancedText && (
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(enhancedText);
                      toast({
                        title: "Copied!",
                        description: "Rephrased text copied to clipboard",
                      });
                    }}
                    data-testid="button-copy-enhanced"
                  >
                    Copy Rephrased Text
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* VIP Raid List */}
        <Card data-testid="card-vip-streams">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              VIP Streams Online
              {vipStreams.length > 0 && (
                <Badge variant="secondary">{vipStreams.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Quick access to raid your VIPs who are currently live</CardDescription>
          </CardHeader>
          <CardContent>
            {vipStreamsLoading ? (
              <div className="text-sm text-muted-foreground">Loading VIP streams...</div>
            ) : vipStreams.length === 0 ? (
              <div className="text-sm text-muted-foreground">No VIPs currently streaming. They'll appear here when they go live!</div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {vipStreams.map((stream) => (
                    <div
                      key={stream.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border hover-elevate"
                      data-testid={`vip-stream-${stream.user_id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">{stream.user_name}</span>
                          <Badge variant="outline" className="text-xs">
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-1" />
                            LIVE
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {stream.viewer_count.toLocaleString()} viewers
                          </span>
                          <span className="truncate">{stream.game_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedStream(stream)}
                          data-testid={`button-view-stream-${stream.user_id}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRaid(stream)}
                          data-testid={`button-raid-stream-${stream.user_id}`}
                        >
                          <Rocket className="h-4 w-4 mr-1" />
                          Raid
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Stream Player Dialog */}
        <Dialog open={!!selectedStream} onOpenChange={() => setSelectedStream(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedStream?.user_name}'s Stream</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStreamMuted(!streamMuted)}
                    data-testid="button-toggle-stream-audio"
                  >
                    {streamMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            {selectedStream && (
              <div className="aspect-video w-full">
                <iframe
                  src={getStreamEmbedUrl(selectedStream)}
                  className="w-full h-full rounded-md"
                  allowFullScreen
                  title={`${selectedStream.user_name}'s stream`}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card data-testid="card-status">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stateLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : state ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${statusColors[state.status]} animate-pulse`} />
                    <span className="text-2xl font-bold" data-testid="text-status">
                      {statusLabels[state.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Next cycle in</div>
                      <div className="text-xl font-bold text-primary" data-testid="text-countdown">
                        {state.secondsUntilNextCycle} seconds
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {state.lastCycleTime && (
                      <div>Last cycle: {format(new Date(state.lastCycleTime), "HH:mm:ss")}</div>
                    )}
                    {state.nextCycleTime && (
                      <div>Next cycle: {format(new Date(state.nextCycleTime), "HH:mm:ss")}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-buffer">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Buffer</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {bufferLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-2xl font-bold" data-testid="text-buffer-count">
                    {buffer.length} messages
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {state?.secondsUntilNextCycle !== undefined && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span data-testid="text-countdown">
                          {state.secondsUntilNextCycle}s until next cycle
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-ai-responses">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Responses</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold" data-testid="text-ai-response-count">
                  {aiResponseLogs.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total generated
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="card-current-buffer">
            <CardHeader>
              <CardTitle>Current Buffer</CardTitle>
              <CardDescription>Messages waiting for processing</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {bufferLoading ? (
                  <div className="text-sm text-muted-foreground">Loading buffer...</div>
                ) : buffer.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Buffer is empty</div>
                ) : (
                  <div className="space-y-2">
                    {buffer.map((msg, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-md bg-card border hover-elevate"
                        data-testid={`buffer-message-${idx}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{msg.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.timestamp), "HH:mm:ss")}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card data-testid="card-event-log">
            <CardHeader>
              <CardTitle>Event Log</CardTitle>
              <CardDescription>Real-time system events</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {logsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading logs...</div>
                ) : logs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No logs yet</div>
                ) : (
                  <div className="space-y-2">
                    {[...logs].reverse().map((log, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-md border ${logTypeColors[log.type]}`}
                        data-testid={`log-entry-${idx}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {log.type}
                          </Badge>
                          <span className="text-xs opacity-70">
                            {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                          </span>
                        </div>
                        <p className="text-sm">{log.message}</p>
                        {log.data && log.type !== "ai_response" && (
                          <pre className="text-xs mt-2 opacity-60 overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-ai-responses-list">
          <CardHeader>
            <CardTitle>AI Response History</CardTitle>
            <CardDescription>All AI-generated responses</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {aiResponseLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No AI responses yet</div>
              ) : (
                <div className="space-y-4">
                  {[...aiResponseLogs].reverse().map((log, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-md bg-card border hover-elevate"
                      data-testid={`ai-response-${idx}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.timestamp), "PPpp")}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {log.data?.fullResponse || log.message}
                      </p>
                      {log.data?.length && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Length: {log.data.length} characters
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
