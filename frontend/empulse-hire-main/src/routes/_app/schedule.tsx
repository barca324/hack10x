import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { CalendarPlus } from "lucide-react";

export const Route = createFileRoute("/_app/schedule")({ component: SchedulePage });

function SchedulePage() {
  return (
    <div>
      <PageHeader title="Schedule Interview" subtitle="5-step wizard with round-robin panelist suggestion" />
      <div className="p-6">
        <Card className="p-12 text-center">
          <CalendarPlus className="h-12 w-12 text-primary mx-auto mb-3" />
          <h3 className="font-semibold text-lg">Scheduling wizard</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
            The 5-step scheduling wizard (candidate → round → round-robin panelists → candidate slot link → confirm) will be wired up
            in the next phase, alongside the Google Calendar free/busy integration.
          </p>
        </Card>
      </div>
    </div>
  );
}
