import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useWebSocket } from "@/hooks/use-websocket";
import Dashboard from "@/pages/dashboard";
import LiveChat from "@/pages/live-chat";
import Analytics from "@/pages/analytics";
import AiControls from "@/pages/ai-controls";
import DachiStream from "@/pages/dachistream";
import SettingsPage from "@/pages/settings";
import VIPManagement from "@/pages/vip-management";
import RaidManagement from "@/pages/raid-management";
import Monitor from "@/pages/monitor";
import AudioSettings from "@/pages/audio-settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/live-chat" component={LiveChat} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/ai-controls" component={AiControls} />
      <Route path="/dachistream" component={DachiStream} />
      <Route path="/vip-management" component={VIPManagement} />
      <Route path="/raid-management" component={RaidManagement} />
      <Route path="/monitor" component={Monitor} />
      <Route path="/audio-settings" component={AudioSettings} />
      <Route path="/settings" component={SettingsPage} />
    </Switch>
  );
}

function AppContent() {
  useWebSocket();

  const sidebarStyle = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between p-4 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
