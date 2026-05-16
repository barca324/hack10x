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
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 p-4">
      <Card className="max-w-md p-8 text-center">
        <div className="flex justify-center mb-4"><div className="bg-sidebar p-3 rounded-lg"><Logo /></div></div>
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-3" />
        <h1 className="text-2xl font-bold mb-2">Not Authorized</h1>
        <p className="text-muted-foreground mb-2">
          You are not authorized to access this portal.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          If you think this is a mistake, please contact HR.
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/login'}>Back to Login</Button>
      </Card>
    </div>
  );
}
