import { ChartBarIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon, CpuChipIcon, PresentationChartLineIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { SiTwitch } from "react-icons/si";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: ChartBarIcon,
  },
  {
    title: "Live Chat",
    url: "/live-chat",
    icon: ChatBubbleLeftRightIcon,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: PresentationChartLineIcon,
  },
  {
    title: "AI Controls",
    url: "/ai-controls",
    icon: CpuChipIcon,
  },
  {
    title: "VIP Management",
    url: "/vip-management",
    icon: ShieldCheckIcon,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Cog6ToothIcon,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <SiTwitch className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">Twitch AI</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
