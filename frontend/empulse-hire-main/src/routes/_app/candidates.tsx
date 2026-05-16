import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, normalizeInterview } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Upload, Download, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/candidates")({ component: CandidatesPage });

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-slate-200 text-slate-700",
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-purple-100 text-purple-700",
  selected: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  manual_intervention: "bg-primary/15 text-primary",
};

const TEMPLATE_HEADERS = ["Candidate Name", "Email", "Phone", "Role Applied For", "Notes"];

function downloadTemplate() {
  const csv = TEMPLATE_HEADERS.join(",") + "\nJane Doe,jane@example.com,9999999999,Software Engineer,Strong React background\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "candidate_template.csv"; a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const split = (l: string) => l.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
  return { headers: split(lines[0]), rows: lines.slice(1).map(split) };
}

function CandidatesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [panelistFilter, setPanelistFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<{ ok: any[]; errors: { row: number; reason: string }[] } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role_applied: "", resume_url: "", jd_url: "", notes: "" });

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => api<any[]>("/api/candidates"),
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ["candidate-interviews"],
    queryFn: async () => {
      const raw = await api<any[]>("/api/interviews");
      return raw.map(normalizeInterview);
    },
  });

  const latestByCand = useMemo(() => {
    const m = new Map<string, any>();
    for (const i of interviews as any[]) {
      const cid = String(i.candidate_id);
      if (!m.has(cid)) m.set(cid, i);
    }
    return m;
  }, [interviews]);

  const enriched = useMemo(
    () => (candidates as any[]).map((c) => {
      const li = latestByCand.get(String(c.id));
      const interviewStatus = li?.status === 'done' ? c.status : (li?.status ?? c.status);
      return { ...c, panelist_name: li?.panelists?.name ?? null, interview_status: interviewStatus };
    }),
    [candidates, latestByCand],
  );

  const roleOptions = useMemo(() => Array.from(new Set((candidates as any[]).map((c) => c.role_applied).filter(Boolean))), [candidates]);

  const filtered = enriched.filter((c) => {
    if (roleFilter !== "all" && c.role_applied !== roleFilter) return false;
    if (statusFilter !== "all" && c.interview_status !== statusFilter) return false;
    if (panelistFilter === "assigned" && !c.panelist_name) return false;
    if (panelistFilter === "unassigned" && c.panelist_name) return false;
    if (q && !`${c.name} ${c.email} ${c.role_applied} ${c.phone ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const clearFilters = () => { setQ(""); setRoleFilter("all"); setStatusFilter("all"); setPanelistFilter("all"); };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.email.trim()) return toast.error("Email is required");
    if (!form.email.toLowerCase().endsWith("@gmail.com")) return toast.error("Email must be a Gmail address");
    if (!form.phone.trim()) return toast.error("Phone is required");
    if (!/^\d{10}$/.test(form.phone.trim())) return toast.error("Phone must be a 10-digit number");
    if (!form.resume_url) return toast.error("Resume Drive link is required");
    if (!form.jd_url) return toast.error("JD Drive link is required");
    try {
      await api("/api/candidates", {
        method: "POST",
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, role_applied: form.role_applied, resume_url: form.resume_url, jd_url: form.jd_url, notes: form.notes }),
      });
      toast.success("Candidate added");
      setOpen(false);
      setForm({ name: "", email: "", phone: "", role_applied: "", resume_url: "", jd_url: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["candidates"] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  const onBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    const expected = TEMPLATE_HEADERS.map((h) => h.toLowerCase());
    const got = headers.map((h) => h.toLowerCase());
    if (expected.some((h, i) => got[i] !== h)) { toast.error("Headers must be: " + TEMPLATE_HEADERS.join(", ")); return; }
    const ok: any[] = [];
    const errors: { row: number; reason: string }[] = [];
    rows.forEach((r, idx) => {
      const [name, email, phone, role, notes] = r;
      if (!name) return errors.push({ row: idx + 2, reason: "Missing Name" });
      if (!email) return errors.push({ row: idx + 2, reason: "Missing Email" });
      ok.push({ name, email, phone, role_applied: role || "Unspecified", notes, level_code: "E1" });
    });
    setBulkPreview({ ok, errors });
  };

  const confirmBulk = async () => {
    if (!bulkPreview?.ok.length) return;
    try {
      for (const r of bulkPreview.ok) {
        await api("/api/candidates", { method: "POST", body: JSON.stringify(r) });
      }
      toast.success(`Imported ${bulkPreview.ok.length} candidates`);
      setBulkOpen(false); setBulkPreview(null);
      qc.invalidateQueries({ queryKey: ["candidates"] });
    } catch (e: any) { toast.error(e.message ?? "Import failed"); }
  };

  return (
    <div>
      <PageHeader
        title="Candidates"
        subtitle={`${candidates.length} total candidates`}
        actions={
          <>
            <Sheet open={bulkOpen} onOpenChange={(v) => { setBulkOpen(v); if (!v) setBulkPreview(null); }}>
              <SheetTrigger asChild><Button variant="outline"><Upload className="h-4 w-4 mr-1" />Bulk Upload</Button></SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg p-6 overflow-y-auto">
                <SheetHeader><SheetTitle>Bulk Upload Candidates</SheetTitle></SheetHeader>
                <div className="mt-4 space-y-3">
                  <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" />Download Template</Button>
                  <p className="text-xs text-muted-foreground">Required columns: <strong>{TEMPLATE_HEADERS.join(" | ")}</strong>.</p>
                  <Input type="file" accept=".csv" onChange={onBulkFile} />
                  {bulkPreview && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{bulkPreview.ok.length} valid · {bulkPreview.errors.length} errors</div>
                      {bulkPreview.errors.length > 0 && (
                        <Card className="p-3 max-h-40 overflow-y-auto bg-red-50 border-red-200">
                          {bulkPreview.errors.map((e, i) => <div key={i} className="text-xs text-red-700">Row {e.row}: {e.reason}</div>)}
                        </Card>
                      )}
                      {bulkPreview.ok.length > 0 && (
                        <Card className="p-3 max-h-60 overflow-y-auto">
                          {bulkPreview.ok.slice(0, 20).map((r, i) => <div key={i} className="text-xs border-b py-1 last:border-0">{r.name} · {r.email} · {r.role_applied}</div>)}
                          {bulkPreview.ok.length > 20 && <div className="text-xs text-muted-foreground pt-1">…and {bulkPreview.ok.length - 20} more</div>}
                        </Card>
                      )}
                      <Button onClick={confirmBulk} disabled={!bulkPreview.ok.length} className="w-full">Import {bulkPreview.ok.length} candidates</Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Add Candidate</Button></SheetTrigger>
              <SheetContent className="w-full sm:max-w-md p-6">
                <SheetHeader><SheetTitle>New Candidate</SheetTitle></SheetHeader>
                <div className="space-y-3 mt-4">
                  <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>Role Applied</Label><Input value={form.role_applied} onChange={(e) => setForm({ ...form, role_applied: e.target.value })} /></div>
                  <div><Label>Resume (Google Drive link) *</Label><Input placeholder="https://drive.google.com/…" value={form.resume_url} onChange={(e) => setForm({ ...form, resume_url: e.target.value })} /></div>
                  <div><Label>JD (Google Drive link) *</Label><Input placeholder="https://drive.google.com/…" value={form.jd_url} onChange={(e) => setForm({ ...form, jd_url: e.target.value })} /></div>
                  <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                  <Button onClick={submit} className="w-full">Save</Button>
                </div>
              </SheetContent>
            </Sheet>
          </>
        }
      />

      <div className="p-6 space-y-4">
        <Card className="p-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, email, phone, role…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {roleOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.keys(STATUS_STYLE).map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={panelistFilter} onValueChange={setPanelistFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Panelist" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3 w-3 mr-1" />Clear Filters</Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Showing {filtered.length} of {candidates.length} results</div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Resume</th>
                  <th className="px-4 py-3 text-left">Panelist Assigned</th>
                  <th className="px-4 py-3 text-left">Interview Status</th>
                  <th className="px-4 py-3 text-left">Added</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No candidates match the filters.</td></tr>
                ) : filtered.map((c: any, i: number) => (
                  <tr key={c.id} className="border-t hover:bg-accent/40">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.email}</td>
                    <td className="px-4 py-3">{c.phone || "—"}</td>
                    <td className="px-4 py-3">{c.role_applied}</td>
                    <td className="px-4 py-3">{c.resume_url ? <a href={c.resume_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a> : "—"}</td>
                    <td className="px-4 py-3">{c.panelist_name ? <span className="text-foreground">{c.panelist_name}</span> : <span className="text-muted-foreground italic">Not Assigned</span>}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium capitalize ${STATUS_STYLE[c.interview_status] ?? "bg-slate-200 text-slate-700"}`}>{String(c.interview_status).replace(/_/g, " ")}</span></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(c.added_on).toLocaleDateString()}</td>
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
