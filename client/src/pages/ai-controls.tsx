import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AiCommand, InsertAiCommand } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
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

  const { data: commands = [], isLoading } = useQuery<AiCommand[]>({
    queryKey: ["/api/commands"],
  });

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="page-title-ai-controls">AI Controls</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure AI commands and moderation settings
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
