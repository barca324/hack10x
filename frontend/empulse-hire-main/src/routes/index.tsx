import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { loading, user, allowed, isAdmin, isHR, isPanelist } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  if (!allowed) return <Navigate to="/access-denied" />;
  // Panelist-only users go straight to feedback. Admin/HR go to dashboard.
  if (isPanelist && !isAdmin && !isHR) return <Navigate to="/feedback" />;
  return <Navigate to="/dashboard" />;
}
