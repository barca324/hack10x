import { createFileRoute, Outlet, Navigate, useRouterState } from "@tanstack/react-router";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

// Routes accessible per role
const PANELIST_ONLY_PATHS = ["/feedback"];
const HR_FORBIDDEN_PATHS = ["/admin"];

function AppShell() {
  const { loading, user, allowed, isAdmin, isHR, isPanelist } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  if (!allowed) return <Navigate to="/access-denied" />;

  // Panelist-only users: lock to /feedback
  const panelistOnly = isPanelist && !isAdmin && !isHR;
  if (panelistOnly && !PANELIST_ONLY_PATHS.some((p) => path.startsWith(p))) {
    return <Navigate to="/feedback" />;
  }

  // HR (without admin): block admin
  if (isHR && !isAdmin && HR_FORBIDDEN_PATHS.some((p) => path.startsWith(p))) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
