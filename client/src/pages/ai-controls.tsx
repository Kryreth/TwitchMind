import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AiCommand, InsertAiCommand, Settings, InsertSettings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { PlusIcon, TrashIcon, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AiControls() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trigger, setTrigger] = useState("");
  const [prompt, setPrompt] = useState("");
  const [responseType, setResponseType] = useState("direct");

  // Groq AI Settings
  const [aiModel, setAiModel] = useState("llama-3.3-70b-versatile");
  const [temperature, setTemperature] = useState([7]);
  const [aiPersonality, setAiPersonality] = useState("Casual");

  const { data: commands = [], isLoading } = useQuery<AiCommand[]>({
    queryKey: ["/api/commands"],
  });

  const { data: settings } = useQuery<Settings[]>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings && settings.length > 0) {
      const setting = settings[0];
      setAiModel(setting.dachipoolAiModel || "llama-3.3-70b-versatile");
      setTemperature([setting.dachipoolAiTemp || 7]);
      setAiPersonality(setting.aiPersonality || "Casual");
    }
  }, [settings]);

  const createCommandMutation = useMutation({
    mutationFn: (data: InsertAiCommand) => apiRequest("POST", "/api/commands", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      toast({
        title: "Command created",
        description: "Your AI command has been created successfully.",
      });
      setDialogOpen(false);
      setTrigger("");
      setPrompt("");
      setResponseType("direct");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create command. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCommandMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/commands/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      toast({
        title: "Command deleted",
        description: "The command has been removed.",
      });
    },
  });

  const toggleCommandMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiRequest("PATCH", `/api/commands/${id}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
    },
  });

  const updateAiSettingsMutation = useMutation({
    mutationFn: (data: Partial<InsertSettings>) => 
      settings && settings.length > 0
        ? apiRequest("PATCH", `/api/settings/${settings[0].id}`, data)
        : apiRequest("POST", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "AI Settings saved",
        description: "Your AI configuration has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save AI settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveAiSettings = () => {
    updateAiSettingsMutation.mutate({
      dachipoolAiModel: aiModel,
      dachipoolAiTemp: temperature[0],
      aiPersonality,
    });
  };

  const handleCreateCommand = () => {
    if (!trigger || !prompt) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createCommandMutation.mutate({
      trigger,
      prompt,
      responseType,
      enabled: true,
    });
  };

  const personalityDescriptions: Record<string, string> = {
    Casual: "Friendly and relaxed, like chatting with a friend",
    Comedy: "Witty and humorous, always ready with a joke",
    Quirky: "Unique and playful with unexpected responses",
    Serious: "Professional and focused, straight to the point",
    Gaming: "Energetic gamer vibes with gaming references",
    Professional: "Polished and business-like communication",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="page-title-ai-controls">AI Controls</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure AI personality, model settings, and custom commands
        </p>
      </div>

      <Card data-testid="card-ai-settings">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">AI Configuration</CardTitle>
          </div>
          <CardDescription>
            Customize how your AI assistant responds to chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="personality">AI Personality</Label>
              <Select value={aiPersonality} onValueChange={setAiPersonality}>
                <SelectTrigger id="personality" data-testid="select-personality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Casual">🙂 Casual</SelectItem>
                  <SelectItem value="Comedy">😄 Comedy</SelectItem>
                  <SelectItem value="Quirky">🎨 Quirky</SelectItem>
                  <SelectItem value="Serious">🎯 Serious</SelectItem>
                  <SelectItem value="Gaming">🎮 Gaming</SelectItem>
                  <SelectItem value="Professional">💼 Professional</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {personalityDescriptions[aiPersonality]}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">Groq AI Model</Label>
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger id="model" data-testid="select-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B (Best Quality)</SelectItem>
                    <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B (Balanced)</SelectItem>
                    <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B (Long Context)</SelectItem>
                    <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B (Fastest)</SelectItem>
                    <SelectItem value="gemma2-9b-it">Gemma 2 9B (Efficient)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Creativity: {(temperature[0] / 10).toFixed(1)}</Label>
                <Slider
                  id="temperature"
                  min={0}
                  max={10}
                  step={1}
                  value={temperature}
                  onValueChange={setTemperature}
                  data-testid="slider-temperature"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Predictable</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveAiSettings}
              disabled={updateAiSettingsMutation.isPending}
              data-testid="button-save-ai-settings"
            >
              {updateAiSettingsMutation.isPending ? "Saving..." : "Save AI Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Custom Commands</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create AI commands triggered by chat messages
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-command">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Command
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-command">
            <DialogHeader>
              <DialogTitle>Create AI Command</DialogTitle>
              <DialogDescription>
                Add a new command that triggers AI responses in your chat
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="trigger">Trigger (e.g., !help)</Label>
                <Input
                  id="trigger"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  placeholder="!mycommand"
                  data-testid="input-trigger"
                />
              </div>
              <div>
                <Label htmlFor="prompt">AI Prompt</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what the AI should do..."
                  rows={3}
                  data-testid="input-prompt"
                />
              </div>
              <div>
                <Label htmlFor="responseType">Response Type</Label>
                <Select value={responseType} onValueChange={setResponseType}>
                  <SelectTrigger id="responseType" data-testid="select-response-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct Response</SelectItem>
                    <SelectItem value="analysis">Analysis</SelectItem>
                    <SelectItem value="generate">Generate Content</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                onClick={handleCreateCommand}
                disabled={createCommandMutation.isPending}
                data-testid="button-save-command"
              >
                {createCommandMutation.isPending ? "Creating..." : "Create Command"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card data-testid="card-commands">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Active Commands</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          ) : commands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No commands configured yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first AI command to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {commands.map((command) => (
                <div
                  key={command.id}
                  className="flex items-center justify-between p-4 rounded-md bg-card border border-card-border hover-elevate"
                  data-testid={`command-${command.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="font-mono" data-testid={`command-trigger-${command.id}`}>
                        {command.trigger}
                      </Badge>
                      <Badge variant="secondary" data-testid={`command-type-${command.id}`}>
                        {command.responseType}
                      </Badge>
                      {command.usageCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Used {command.usageCount} times
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {command.prompt}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Switch
                      checked={command.enabled}
                      onCheckedChange={(enabled) =>
                        toggleCommandMutation.mutate({ id: command.id, enabled })
                      }
                      data-testid={`switch-enabled-${command.id}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteCommandMutation.mutate(command.id)}
                      data-testid={`button-delete-${command.id}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
