import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, normalizeInterview } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, X, Plus, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/interviews")({ component: InterviewsPage });

function InterviewsPage() {
  const { isAdmin, isHR } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ candidateId: "", panelistId: "", date: "", time: "" });
  const [submitting, setSubmitting] = useState(false);
  const [reportInterview, setReportInterview] = useState<any>(null);

  const { data: interviews = [] } = useQuery({
    queryKey: ["interviews-all"],
    queryFn: async () => {
      const raw = await api<any[]>("/api/interviews");
      return raw.map(normalizeInterview);
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    enabled: open,
    queryFn: () => api<any[]>("/api/candidates"),
  });

  const { data: panelists = [] } = useQuery({
    queryKey: ["panelists"],
    enabled: open,
    queryFn: () => api<any[]>("/api/panelists"),
  });

  const statuses = useMemo(() => Array.from(new Set(interviews.map((i: any) => i.status))), [interviews]);
  const filtered = interviews.filter((i: any) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (q && !`${i.candidates?.name ?? ""} ${i.candidates?.role_applied ?? ""} ${i.panelists?.name ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const schedule = async () => {
    if (!form.candidateId) return toast.error("Select a candidate");
    if (!form.panelistId) return toast.error("Select a panelist");
    if (!form.date) return toast.error("Select a date");
    if (!form.time) return toast.error("Select a time");

    const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
    setSubmitting(true);
    try {
      await api("/api/interviews/schedule", {
        method: "POST",
        body: JSON.stringify({ candidateId: form.candidateId, panelistId: form.panelistId, scheduledAt }),
      });
      toast.success("Interview scheduled — confirmation emails sent");
      setOpen(false);
      setForm({ candidateId: "", panelistId: "", date: "", time: "" });
      qc.invalidateQueries({ queryKey: ["interviews-all"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to schedule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Interviews"
        subtitle={`${interviews.length} total interviews`}
        actions={
          (isAdmin || isHR) ? (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" />Schedule Interview</Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md p-6">
                <SheetHeader><SheetTitle>Schedule Interview</SheetTitle></SheetHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Candidate</Label>
                    <Select value={form.candidateId} onValueChange={(v) => setForm({ ...form, candidateId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select candidate" /></SelectTrigger>
                      <SelectContent>
                        {(candidates as any[]).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} — {c.role_applied}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Panelist</Label>
                    <Select value={form.panelistId} onValueChange={(v) => setForm({ ...form, panelistId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select panelist" /></SelectTrigger>
                      <SelectContent>
                        {(panelists as any[]).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} — {p.designation || p.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                  <Button onClick={schedule} disabled={submitting} className="w-full">
                    {submitting ? "Scheduling…" : "Confirm & Send Emails"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          ) : null
        }
      />
      <div className="p-6 space-y-4">
        <Card className="p-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search candidate, panelist, role…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {statuses.map((s: any) => <SelectItem key={s} value={s}>{String(s).replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => { setQ(""); setStatusFilter("all"); }}>
              <X className="h-3 w-3 mr-1" />Clear Filters
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Showing {filtered.length} of {interviews.length} results</div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  {["#", "Date", "Slot", "Candidate", "Role", "Panelist", "Round", "Status", "Report"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No interviews match the filters.</td></tr>
                ) : filtered.map((i: any, idx: number) => (
                  <tr key={i.id} className="border-t hover:bg-accent/40">
                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3">{i.scheduled_date || "—"}</td>
                    <td className="px-4 py-3">{i.slot_time || "—"}</td>
                    <td className="px-4 py-3 font-medium">{i.candidates?.name || "—"}</td>
                    <td className="px-4 py-3">{i.candidates?.role_applied || "—"}</td>
                    <td className="px-4 py-3">{i.panelists?.name || "—"}</td>
                    <td className="px-4 py-3">R{i.round_number}</td>
                    <td className="px-4 py-3 capitalize text-xs">{i.status.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      {i.report_html ? (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setReportInterview(i)}>
                          <FileText className="h-3.5 w-3.5 mr-1" />View
                        </Button>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Sheet open={!!reportInterview} onOpenChange={(v) => { if (!v) setReportInterview(null); }}>
        <SheetContent className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Interview Report — {reportInterview?.candidates?.name ?? ""}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 prose prose-sm max-w-none dark:prose-invert">
            {reportInterview?.report_html ? (
              <div dangerouslySetInnerHTML={{ __html: reportInterview.report_html }} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
