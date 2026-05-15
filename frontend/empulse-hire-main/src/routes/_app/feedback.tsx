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

export const Route = createFileRoute("/_app/feedback")({ component: FeedbackPage });

function FeedbackPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Get the panelist record linked to the currently logged-in user
  const { data: me } = useQuery({
    queryKey: ["me-panelist"],
    queryFn: () => api<any | null>("/api/panelists/me"),
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["my-interviews", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const raw = await api<any[]>("/api/interviews");
      return raw
        .filter((i: any) => String(i.panelistId?._id ?? i.panelistId) === String(me!.id))
        .map(normalizeInterview);
    },
  });

  const enriched = useMemo(
    () => (rows as any[]).map((r) => ({ ...r, feedback_status: r.feedback_url ? "submitted" : "pending" })),
    [rows],
  );

  const filtered = enriched.filter((r) => {
    if (statusFilter !== "all" && r.feedback_status !== statusFilter) return false;
    if (q && !`${r.candidates?.name ?? ""} ${r.candidates?.role_applied ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="My Feedback" subtitle="Interviews you've conducted" />
      <div className="p-6 space-y-4">
        <Card className="p-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search candidate or role…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Feedback Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending Upload</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => { setQ(""); setStatusFilter("all"); }}>
              <X className="h-3 w-3 mr-1" />Clear Filters
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Showing {filtered.length} of {enriched.length} results</div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Slot</th>
                  <th className="px-4 py-3 text-left">Candidate</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Round</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {!me ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No panelist profile linked to your account.</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No interviews found.</td></tr>
                ) : filtered.map((r: any) => (
                  <tr key={r.id} className="border-t hover:bg-accent/40">
                    <td className="px-4 py-3">{r.scheduled_date ?? "—"}</td>
                    <td className="px-4 py-3">{r.slot_time ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">{r.candidates?.name}</td>
                    <td className="px-4 py-3">{r.candidates?.role_applied}</td>
                    <td className="px-4 py-3">R{r.round_number}</td>
                    <td className="px-4 py-3 capitalize text-xs">{r.status.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${r.feedback_status === "submitted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.feedback_status === "submitted" ? "Submitted" : "Pending Upload"}
                      </span>
                    </td>
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
