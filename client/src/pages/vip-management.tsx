import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Shield, Trash2, Plus, Clock } from "lucide-react";
import type { UserProfile } from "@shared/schema";

export default function VIPManagement() {
  const { toast } = useToast();
  const [newUsername, setNewUsername] = useState("");

  const { data: vips = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/users/vips"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const toggleVipMutation = useMutation({
    mutationFn: async ({ userId, isVip }: { userId: string; isVip: boolean }) => {
      return await apiRequest(`/api/users/${userId}/vip`, {
        method: "PATCH",
        body: JSON.stringify({ isVip }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/vips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "VIP Status Updated",
        description: "User VIP status has been changed successfully.",
      });
    },
  });

  const addVipMutation = useMutation({
    mutationFn: async (username: string) => {
      const users = await apiRequest<UserProfile[]>("/api/users");
      const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      
      if (existingUser) {
        return await apiRequest(`/api/users/${existingUser.userId}/vip`, {
          method: "PATCH",
          body: JSON.stringify({ isVip: true }),
          headers: { "Content-Type": "application/json" },
        });
      } else {
        const newUser = await apiRequest("/api/users", {
          method: "POST",
          body: JSON.stringify({
            userId: `manual_${username}_${Date.now()}`,
            username,
            isVip: true,
            isMod: false,
            isSubscriber: false,
            wasAnonymous: false,
          }),
          headers: { "Content-Type": "application/json" },
        });
        return await apiRequest(`/api/users/${newUser.userId}/vip`, {
          method: "PATCH",
          body: JSON.stringify({ isVip: true }),
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    onSuccess: () => {
      setNewUsername("");
      queryClient.invalidateQueries({ queryKey: ["/api/users/vips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "VIP Added",
        description: "User has been added to VIP list.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add VIP user.",
        variant: "destructive",
      });
    },
  });

  const handleAddVip = () => {
    if (newUsername.trim()) {
      addVipMutation.mutate(newUsername.trim());
    }
  };

  const handleRemoveVip = (userId: string) => {
    toggleVipMutation.mutate({ userId, isVip: false });
  };

  const getTimeSinceShoutout = (shoutoutDate: string | null) => {
    if (!shoutoutDate) return "Never";
    
    const now = new Date().getTime();
    const lastShoutout = new Date(shoutoutDate).getTime();
    const diffMs = now - lastShoutout;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "Recently";
  };

  const getCooldownStatus = (shoutoutDate: string | null, cooldownHours: number) => {
    if (!shoutoutDate) return "Ready";
    
    const now = new Date().getTime();
    const lastShoutout = new Date(shoutoutDate).getTime();
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const timeLeft = cooldownMs - (now - lastShoutout);
    
    if (timeLeft <= 0) return "Ready";
    
    const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
    return `${hoursLeft}h cooldown`;
  };

  const autoShoutoutsEnabled = settings && settings[0]?.autoShoutoutsEnabled;
  const cooldownHours = settings && settings[0]?.dachipoolShoutoutCooldownHours || 24;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">VIP Shout-Out Management</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Manage VIP users who receive automatic shoutouts when they interact in chat.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New VIP</CardTitle>
          <CardDescription>
            Add a Twitch username to the VIP shoutout list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter username..."
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddVip()}
              data-testid="input-vip-username"
            />
            <Button 
              onClick={handleAddVip}
              disabled={!newUsername.trim() || addVipMutation.isPending}
              data-testid="button-add-vip"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add VIP
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>VIP Users ({vips.length})</span>
            <Badge variant={autoShoutoutsEnabled ? "default" : "secondary"} data-testid="badge-shoutouts-status">
              {autoShoutoutsEnabled ? "Auto Shoutouts Active" : "Auto Shoutouts Disabled"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {autoShoutoutsEnabled 
              ? `Shoutouts will be sent automatically with a ${cooldownHours}h cooldown`
              : "Enable auto shoutouts in Settings to activate automatic greetings"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading VIPs...</div>
          ) : vips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-vips">
              No VIP users yet. Add your first VIP above!
            </div>
          ) : (
            <div className="space-y-2">
              {vips.map((vip) => (
                <div
                  key={vip.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate"
                  data-testid={`card-vip-${vip.userId}`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium" data-testid={`text-vip-username-${vip.userId}`}>
                        {vip.username}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span data-testid={`text-vip-last-shoutout-${vip.userId}`}>
                          Last shoutout: {getTimeSinceShoutout(vip.shoutoutLastGiven)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" data-testid={`badge-vip-cooldown-${vip.userId}`}>
                      {getCooldownStatus(vip.shoutoutLastGiven, cooldownHours)}
                    </Badge>
                    {vip.isMod && <Badge variant="secondary">Mod</Badge>}
                    {vip.isSubscriber && <Badge variant="secondary">Sub</Badge>}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveVip(vip.userId)}
                      disabled={toggleVipMutation.isPending}
                      data-testid={`button-remove-vip-${vip.userId}`}
                    >
                      <Trash2 className="h-4 w-4" />
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
