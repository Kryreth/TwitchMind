import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, ExternalLink, Loader2, Rocket, Crown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { UserProfile } from "@shared/schema";

interface Raid {
  id: number;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  viewers: number;
  timestamp: string;
}

interface TwitchSearchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

export default function RaidManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [raidTarget, setRaidTarget] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: raids = [], isLoading: raidsLoading } = useQuery<Raid[]>({
    queryKey: ["/api/raids"],
    refetchInterval: 5000,
  });

  const { data: vips = [] } = useQuery<UserProfile[]>({
    queryKey: ["/api/users/vips"],
  });

  const { data: suggestions = [], isLoading: isSearching } = useQuery<TwitchSearchUser[]>({
    queryKey: [`/api/twitch/search-users?query=${searchQuery}`],
    enabled: searchQuery.length > 1,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(raidTarget);
      if (raidTarget.length > 1) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [raidTarget]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const startRaidMutation = useMutation({
    mutationFn: async (toUsername: string) => {
      return await apiRequest("POST", "/api/raids/start", { toUsername });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Raid Started!",
        description: `Successfully started raid to ${data.message?.split("to ")[1] || "target channel"}`,
      });
      setRaidTarget("");
      setShowSuggestions(false);
    },
    onError: (error: any) => {
      toast({
        title: "Raid Failed",
        description: error.message || "Failed to start raid. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectUser = (username: string) => {
    setRaidTarget(username);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleRaidVIP = (username: string) => {
    startRaidMutation.mutate(username);
  };

  const handleRaidSearch = () => {
    if (raidTarget.trim()) {
      startRaidMutation.mutate(raidTarget.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && suggestions.length > 0 && showSuggestions) {
      e.preventDefault();
      handleSelectUser(suggestions[0].login);
    } else if (e.key === "Enter" && !showSuggestions && raidTarget.trim()) {
      e.preventDefault();
      handleRaidSearch();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-raid-management">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
          Raid Management
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          View incoming raids and send your viewers to raid other channels
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming Raids */}
        <Card data-testid="card-incoming-raids">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Incoming Raids
            </CardTitle>
            <CardDescription>Recent raids from other streamers</CardDescription>
          </CardHeader>
          <CardContent>
            {raidsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : raids.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-raids">
                No raids yet. When someone raids your channel, they'll appear here!
              </div>
            ) : (
              <div className="space-y-3">
                {raids.map((raid) => (
                  <div
                    key={raid.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover-elevate"
                    data-testid={`card-raid-${raid.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={`https://unavatar.io/twitch/${raid.fromUsername}`}
                          alt={raid.fromDisplayName}
                        />
                        <AvatarFallback>{raid.fromDisplayName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">
                            {raid.fromDisplayName}
                          </span>
                          <Badge variant="secondary" className="shrink-0">
                            {raid.viewers} {raid.viewers === 1 ? 'viewer' : 'viewers'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(raid.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      data-testid={`button-view-profile-${raid.id}`}
                    >
                      <a
                        href={`https://www.twitch.tv/${raid.fromUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on Twitch"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outgoing Raids */}
        <Card data-testid="card-outgoing-raids">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Start a Raid
            </CardTitle>
            <CardDescription>Send your viewers to raid another channel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* VIP Quick Raid */}
            {vips.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-primary" />
                  Your VIPs
                </h3>
                <div className="space-y-2">
                  {vips.map((vip) => (
                    <div
                      key={vip.userId}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover-elevate"
                      data-testid={`card-vip-${vip.userId}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={`https://unavatar.io/twitch/${vip.username}`}
                            alt={vip.username}
                          />
                          <AvatarFallback>{vip.username[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{vip.username}</span>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleRaidVIP(vip.username)}
                        disabled={startRaidMutation.isPending}
                        data-testid={`button-raid-vip-${vip.userId}`}
                      >
                        {startRaidMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Rocket className="h-4 w-4 mr-2" />
                            Raid
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search and Raid */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Raid Any Channel</h3>
              <div className="relative" ref={dropdownRef}>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Search for a channel..."
                    value={raidTarget}
                    onChange={(e) => setRaidTarget(e.target.value)}
                    onKeyDown={handleKeyDown}
                    data-testid="input-raid-search"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleRaidSearch}
                    disabled={!raidTarget.trim() || startRaidMutation.isPending}
                    data-testid="button-raid-search"
                  >
                    {startRaidMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Raid
                      </>
                    )}
                  </Button>
                </div>

                {/* Autocomplete Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      </div>
                    ) : (
                      suggestions.map((user) => (
                        <button
                          key={user.id}
                          className="w-full flex items-center gap-3 p-3 hover-elevate text-left"
                          onClick={() => handleSelectUser(user.login)}
                          data-testid={`button-suggestion-${user.login}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profile_image_url} alt={user.display_name} />
                            <AvatarFallback>{user.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">{user.display_name}</div>
                            <div className="text-sm text-muted-foreground">@{user.login}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Start typing to search all Twitch channels, or select a VIP above
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
