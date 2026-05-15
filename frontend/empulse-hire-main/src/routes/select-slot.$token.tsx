import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/select-slot/$token")({
  component: SelectSlotPage,
});

function SelectSlotPage() {
  const { token } = Route.useParams();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 p-4">
      <Card className="max-w-lg w-full p-8">
        <div className="flex justify-center mb-6"><div className="bg-sidebar p-3 rounded-lg"><Logo /></div></div>
        <h1 className="text-2xl font-bold text-center mb-2">Select Your Interview Slot</h1>
        <p className="text-center text-muted-foreground text-sm mb-6">
          Token: <code className="text-xs">{token}</code>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Your three slot options will be presented here once the scheduling wizard sends them. This page is public and validates the token server-side.
        </p>
      </Card>
    </div>
  );
}
