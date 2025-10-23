import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Shield, Trash2, Plus, Clock, Loader2 } from "lucide-react";
import type { UserProfile } from "@shared/schema";

interface TwitchSearchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

export default function VIPManagement() {
  const { toast } = useToast();
  const [newUsername, setNewUsername] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: vips = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/users/vips"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const { data: suggestions = [], isLoading: isSearching } = useQuery<TwitchSearchUser[]>({
    queryKey: [`/api/twitch/search-users?query=${searchQuery}`],
    enabled: searchQuery.length > 1,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(newUsername);
      if (newUsername.length > 1) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [newUsername]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleVipMutation = useMutation({
    mutationFn: async ({ userId, isVip }: { userId: string; isVip: boolean }) => {
      return await apiRequest("PATCH", `/api/users/${userId}/vip`, { isVip });
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
      const response = await fetch("/api/users");
      const users: UserProfile[] = await response.json();
      const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      
      if (existingUser) {
        const res = await apiRequest("PATCH", `/api/users/${existingUser.userId}/vip`, { isVip: true });
        return await res.json();
      } else {
        const userRes = await apiRequest("POST", "/api/users", {
          userId: `manual_${username}_${Date.now()}`,
          username,
          isVip: true,
          isMod: false,
          isSubscriber: false,
          wasAnonymous: false,
        });
        const newUser: UserProfile = await userRes.json();
        const vipRes = await apiRequest("PATCH", `/api/users/${newUser.userId}/vip`, { isVip: true });
        return await vipRes.json();
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

  const handleSelectUser = (username: string) => {
    setNewUsername(username);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleAddVip = () => {
    if (newUsername.trim()) {
      addVipMutation.mutate(newUsername.trim());
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0 && showSuggestions) {
        handleSelectUser(suggestions[0].login);
      } else if (newUsername.trim()) {
        handleAddVip();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    } else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setShowSuggestions(true);
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

  const settingsArray = Array.isArray(settings) ? settings : [];
  const autoShoutoutsEnabled = settingsArray[0]?.autoShoutoutsEnabled;
  const cooldownHours = settingsArray[0]?.dachipoolShoutoutCooldownHours || 24;

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
            <div className="flex-1 relative" ref={dropdownRef}>
              <div className="relative">
                <Input
                  ref={inputRef}
                  placeholder="Search Twitch users..."
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onFocus={() => {
                    if (newUsername.length > 1) {
                      setShowSuggestions(true);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  data-testid="input-vip-username"
                />
                {isSearching && newUsername.length > 1 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {showSuggestions && newUsername.length > 1 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-[300px] overflow-auto">
                  {suggestions.length === 0 && !isSearching ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No Twitch users found
                    </div>
                  ) : (
                    <div className="p-1">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Twitch Users
                      </div>
                      {suggestions.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUser(user.login)}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-sm hover-elevate active-elevate-2 text-left"
                          data-testid={`suggestion-${user.login}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profile_image_url} alt={user.login} />
                            <AvatarFallback>
                              {user.login.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{user.login}</p>
                            {user.display_name !== user.login && (
                              <p className="text-xs text-muted-foreground truncate">
                                {user.display_name}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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
                          Last shoutout: {getTimeSinceShoutout(vip.shoutoutLastGiven ? new Date(vip.shoutoutLastGiven).toISOString() : null)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" data-testid={`badge-vip-cooldown-${vip.userId}`}>
                      {getCooldownStatus(vip.shoutoutLastGiven ? new Date(vip.shoutoutLastGiven).toISOString() : null, cooldownHours)}
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
