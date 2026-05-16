import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, normalizeInterview } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";

export const Route = createFileRoute("/_app/interview-logs")({ component: InterviewLogs });

const EVENT_STYLE: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  slot_sent: "bg-purple-100 text-purple-700",
  slot_selected: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
  feedback_submitted: "bg-indigo-100 text-indigo-700",
  selected: "bg-green-200 text-green-800 font-semibold",
  rejected: "bg-red-100 text-red-700",
  manual_intervention: "bg-orange-100 text-orange-700",
  cancelled: "bg-slate-200 text-slate-600",
  rescheduled: "bg-amber-100 text-amber-700",
};

const EVENT_LABEL: Record<string, string> = {
  scheduled: "Interview Scheduled",
  slot_sent: "Slot Sent to Candidate",
  slot_selected: "Candidate Selected Slot",
  completed: "Interview Completed",
  feedback_submitted: "Feedback Submitted",
  selected: "Candidate Selected",
  rejected: "Candidate Rejected",
  manual_intervention: "Manual Intervention",
  cancelled: "Interview Cancelled",
  rescheduled: "Rescheduled",
};

function buildEvents(interviews: any[], interventions: any[]) {
  const events: any[] = [];
  for (const i of interviews) {
    events.push({
      ts: i.created_at,
      type: i.status === "awaiting_candidate_selection" ? "slot_sent" : "scheduled",
      candidate: i.candidates?.name,
      role: i.candidates?.role_applied,
      panelist: i.panelists?.name ?? "—",
      round: i.round_number,
      details: i.scheduled_date ? `Date: ${i.scheduled_date} ${i.slot_time ?? ""}` : "Awaiting slot",
      status: i.status,
    });
    if (i.status === "completed" || i.status === "selected" || i.status === "rejected") {
      events.push({ ts: i.resolved_at ?? i.created_at, type: "completed", candidate: i.candidates?.name, role: i.candidates?.role_applied, panelist: i.panelists?.name ?? "—", round: i.round_number, details: i.feedback_url ? "Feedback uploaded" : "Pending feedback", status: i.status });
    }
    if (i.result === "selected") {
      events.push({ ts: i.resolved_at ?? i.created_at, type: "selected", candidate: i.candidates?.name, role: i.candidates?.role_applied, panelist: i.panelists?.name ?? "—", round: i.round_number, details: "Selected for next round/offer", status: "selected" });
    } else if (i.result === "rejected") {
      events.push({ ts: i.resolved_at ?? i.created_at, type: "rejected", candidate: i.candidates?.name, role: i.candidates?.role_applied, panelist: i.panelists?.name ?? "—", round: i.round_number, details: "Marked as rejected", status: "rejected" });
    }
    if (i.cancellation_reason) {
      events.push({ ts: i.resolved_at ?? i.created_at, type: "cancelled", candidate: i.candidates?.name, role: i.candidates?.role_applied, panelist: i.panelists?.name ?? "—", round: i.round_number, details: i.cancellation_reason, status: "cancelled" });
    }
  }
  for (const m of interventions) {
    events.push({ ts: m.flagged_at, type: "manual_intervention", candidate: m.candidates?.name ?? "—", role: m.candidates?.role_applied ?? "—", panelist: "—", round: m.round_number, details: m.reason, status: m.status });
  }
  return events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

function InterviewLogs() {
  const [q, setQ] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: rawInterviews = [] } = useQuery({
    queryKey: ["log-interviews"],
    queryFn: async () => {
      const raw = await api<any[]>("/api/interviews");
      return raw.map(normalizeInterview);
    },
  });
  const { data: interventions = [] } = useQuery({
    queryKey: ["log-mi"],
    queryFn: () => api<any[]>("/api/manual-interventions"),
  });

  const events = useMemo(() => buildEvents(rawInterviews, interventions), [rawInterviews, interventions]);

  const filtered = events.filter((e) => {
    if (eventFilter !== "all" && e.type !== eventFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (q && !`${e.candidate ?? ""} ${e.role ?? ""} ${e.panelist ?? ""} ${e.details ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const clear = () => { setQ(""); setEventFilter("all"); setStatusFilter("all"); };

  return (
    <div>
      <PageHeader title="Interview Logs" subtitle="Full activity history of every interview event" />
      <div className="p-6 space-y-4">
        <Card className="p-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search candidate, role, panelist, details…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Event Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                {Object.entries(EVENT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {["scheduled", "completed", "selected", "rejected", "cancelled", "manual_intervention", "open"].map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clear}><X className="h-3 w-3 mr-1" />Clear Filters</Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Showing {filtered.length} of {events.length} events</div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Event Type</th>
                  <th className="px-4 py-3 text-left">Candidate</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Panelist</th>
                  <th className="px-4 py-3 text-left">Round</th>
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No events match the filters.</td></tr>
                ) : filtered.map((e, i) => (
                  <tr key={i} className="border-t hover:bg-accent/40">
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(e.ts).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${EVENT_STYLE[e.type] ?? "bg-slate-200"}`}>{EVENT_LABEL[e.type] ?? e.type}</span></td>
                    <td className="px-4 py-3 font-medium">{e.candidate}</td>
                    <td className="px-4 py-3">{e.role}</td>
                    <td className="px-4 py-3">{e.panelist}</td>
                    <td className="px-4 py-3">R{e.round}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{e.details}</td>
                    <td className="px-4 py-3 text-xs capitalize">{String(e.status).replace(/_/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
