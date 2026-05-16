import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserCog,
  CalendarDays,
  History,
  Bell,
  Settings,
  ClipboardCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface NavItem {
  to: string;
  label: string;
  icon: any;
  visible: (a: { isAdmin: boolean; isHR: boolean; isPanelist: boolean }) => boolean;
}

// Panelist-only users see ONLY My Feedback (handled by panelistOnly guard below).
const items: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, visible: (a) => a.isAdmin || a.isHR },
  { to: "/candidates", label: "Candidates", icon: Users, visible: (a) => a.isAdmin || a.isHR },
  { to: "/panelists", label: "Panelists", icon: UserCog, visible: (a) => a.isAdmin || a.isHR },
  { to: "/interviews", label: "Interviews", icon: CalendarDays, visible: (a) => a.isAdmin || a.isHR },
  { to: "/interview-logs", label: "Interview Logs", icon: History, visible: (a) => a.isAdmin || a.isHR },
  { to: "/interventions", label: "Notifications", icon: Bell, visible: (a) => a.isAdmin || a.isHR },
  { to: "/feedback", label: "My Feedback", icon: ClipboardCheck, visible: (a) => a.isPanelist },
  { to: "/admin", label: "Admin Panel", icon: Settings, visible: (a) => a.isAdmin },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const auth = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

  // For panelist-only users (no admin/hr) restrict to feedback alone.
  const panelistOnly = auth.isPanelist && !auth.isAdmin && !auth.isHR;
  const visibleItems = items.filter((i) => {
    if (panelistOnly) return i.to === "/feedback";
    return i.visible(auth);
  });

  return (
    <aside
      className={`bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      } shrink-0 border-r border-sidebar-border`}
    >
      <div className="h-16 flex items-center justify-between px-3 border-b border-sidebar-border">
        <Logo collapsed={collapsed} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/70"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visibleItems.map((i) => {
          const active = path === i.to || path.startsWith(i.to + "/");
          const Icon = i.icon;
          return (
            <Link
              key={i.to}
              to={i.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{i.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        {!collapsed && auth.allowed && (
          <div className="mb-2 px-2">
            <div className="text-xs font-semibold truncate">{auth.allowed.name}</div>
            <div className="text-[10px] text-sidebar-foreground/60 truncate">{auth.allowed.email}</div>
            <div className="flex gap-1 mt-1">
              <span className="text-[9px] uppercase bg-sidebar-accent px-1.5 py-0.5 rounded">
                {auth.isAdmin ? "Admin" : "HR"}
              </span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={auth.signOut}
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && "Sign out"}
        </Button>
      </div>
    </aside>
  );
}
