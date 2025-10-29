import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { UserProfile, ChatMessage, AiAnalysis } from "@shared/schema";
import { Search, Download, Users, MessageSquare, Brain } from "lucide-react";

interface UserStats {
  profile: UserProfile;
  messageCount: number;
  lastMessage: string | null;
  avgSentiment: number | null;
}

export default function Database() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: profiles } = useQuery<UserProfile[]>({
    queryKey: ["/api/users/profiles"],
  });

  const { data: messages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages"],
  });

  const { data: analyses } = useQuery<AiAnalysis[]>({
    queryKey: ["/api/analyses"],
  });

  // Calculate user stats
  const userStats: UserStats[] = (profiles || []).map(profile => {
    const userMessages = (messages || []).filter(m => m.userId === profile.userId);
    const messageCount = userMessages.length;
    const lastMessage = userMessages[0]?.message || null;
    
    const userAnalyses = (analyses || [])
      .filter(a => userMessages.some(m => m.id === a.messageId))
      .map(a => a.sentimentScore);
    
    const avgSentiment = userAnalyses.length > 0
      ? userAnalyses.reduce((sum, score) => sum + score, 0) / userAnalyses.length
      : null;

    return { profile, messageCount, lastMessage, avgSentiment };
  });

  // Filter users
  const filteredUsers = userStats.filter(stat => {
    const matchesSearch = stat.profile.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = 
      roleFilter === "all" ||
      (roleFilter === "vip" && stat.profile.isVip) ||
      (roleFilter === "mod" && stat.profile.isMod) ||
      (roleFilter === "sub" && stat.profile.isSubscriber);
    
    return matchesSearch && matchesRole;
  });

  const totalUsers = profiles?.length || 0;
  const totalMessages = messages?.length || 0;
  const totalAnalyses = analyses?.length || 0;

  const handleExportCSV = () => {
    const headers = ["Username", "Role", "Message Count", "Avg Sentiment", "Last Seen"];
    const rows = filteredUsers.map(stat => [
      stat.profile.username,
      getRoleText(stat.profile),
      stat.messageCount.toString(),
      stat.avgSentiment?.toFixed(2) || "N/A",
      new Date(stat.profile.lastSeen).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `streamdachi-users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRoleText = (profile: UserProfile): string => {
    const roles = [];
    if (profile.isVip) roles.push("VIP");
    if (profile.isMod) roles.push("Mod");
    if (profile.isSubscriber) roles.push("Sub");
    return roles.length > 0 ? roles.join(", ") : "Viewer";
  };

  const getSentimentBadge = (score: number | null) => {
    if (score === null) return <Badge variant="outline">No Data</Badge>;
    if (score >= 4) return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Positive</Badge>;
    if (score >= 3) return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Neutral</Badge>;
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Negative</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="page-title-database">Database Viewer</h1>
        <p className="text-muted-foreground" data-testid="page-description-database">
          Browse all users, messages, and AI analysis data
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">All tracked users</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-messages">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-messages">{totalMessages}</div>
            <p className="text-xs text-muted-foreground">Chat messages logged</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-analyses">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Analyses</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-analyses">{totalAnalyses}</div>
            <p className="text-xs text-muted-foreground">Messages analyzed</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card data-testid="card-user-database">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>User Database</CardTitle>
              <CardDescription>Search and filter all known users</CardDescription>
            </div>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-users"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="vip">VIPs Only</SelectItem>
                <SelectItem value="mod">Mods Only</SelectItem>
                <SelectItem value="sub">Subs Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Last Message</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(stat => (
                    <TableRow key={stat.profile.id} data-testid={`row-user-${stat.profile.username}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{stat.profile.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{stat.profile.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {stat.profile.isVip && (
                            <Badge variant="default" className="bg-purple-500/20 text-purple-400 border-purple-500/30">VIP</Badge>
                          )}
                          {stat.profile.isMod && (
                            <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Mod</Badge>
                          )}
                          {stat.profile.isSubscriber && (
                            <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Sub</Badge>
                          )}
                          {!stat.profile.isVip && !stat.profile.isMod && !stat.profile.isSubscriber && (
                            <Badge variant="outline">Viewer</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-message-count-${stat.profile.username}`}>
                        {stat.messageCount}
                      </TableCell>
                      <TableCell>
                        {getSentimentBadge(stat.avgSentiment)}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" data-testid={`text-last-message-${stat.profile.username}`}>
                        {stat.lastMessage || <span className="text-muted-foreground">No messages</span>}
                      </TableCell>
                      <TableCell data-testid={`text-last-seen-${stat.profile.username}`}>
                        {new Date(stat.profile.lastSeen).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
