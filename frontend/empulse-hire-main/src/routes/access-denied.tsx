import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/access-denied")({
  component: AccessDenied,
});

function AccessDenied() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 p-4">
      <Card className="max-w-md p-8 text-center">
        <div className="flex justify-center mb-4"><div className="bg-sidebar p-3 rounded-lg"><Logo /></div></div>
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-3" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-sm text-muted-foreground mb-1">
          Your account <span className="font-medium text-foreground">{user?.email}</span> is not on the IndiaMART IMS allow-list.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Please contact your HR administrator to request access.
        </p>
        <Button onClick={signOut} variant="outline">Sign out</Button>
      </Card>
    </div>
  );
}
