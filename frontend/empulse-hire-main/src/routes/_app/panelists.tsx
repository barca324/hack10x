import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/panelists")({ component: PanelistsPage });

function PanelistsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", emp_id: "", email: "", designation: "", roles: "" });
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: panelists = [] } = useQuery({
    queryKey: ["panelists"],
    queryFn: () => api<any[]>("/api/panelists"),
  });

  const filtered = (panelists as any[]).filter((p) => {
    if (activeFilter === "active" && !p.is_active) return false;
    if (activeFilter === "inactive" && p.is_active) return false;
    if (q && !`${p.name} ${p.emp_id} ${p.email} ${p.designation ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const clear = () => { setQ(""); setActiveFilter("all"); };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.emp_id.trim()) return toast.error("Employee ID is required");
    if (!form.email.trim()) return toast.error("Email is required");
    if (!form.email.toLowerCase().endsWith("@indiamart.com")) return toast.error("Email must be an @indiamart.com address");
    if (!form.designation.trim()) return toast.error("Designation is required");
    try {
      const eligible_for = form.roles.split(",").map(r => r.trim()).filter(Boolean);
      await api("/api/panelists", {
        method: "POST",
        body: JSON.stringify({ ...form, eligible_for }),
      });
      toast.success("Panelist added — calendar auth email sent");
      setOpen(false);
      setForm({ name: "", emp_id: "", email: "", designation: "", roles: "" });
      qc.invalidateQueries({ queryKey: ["panelists"] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <div>
      <PageHeader
        title="Panelists"
        subtitle={`${panelists.length} interviewers`}
        actions={
          isAdmin ? (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Add Panelist</Button></SheetTrigger>
              <SheetContent className="w-full sm:max-w-md p-6">
                <SheetHeader><SheetTitle>New Panelist</SheetTitle></SheetHeader>
                <div className="space-y-3 mt-4">
                  <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Employee ID</Label><Input value={form.emp_id} onChange={(e) => setForm({ ...form, emp_id: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Designation</Label><Input placeholder="e.g. Senior Engineer" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
                  <div>
                    <Label>Roles (comma-separated)</Label>
                    <Input placeholder="e.g. Associate Engineer, AI Engineer Intern" value={form.roles} onChange={(e) => setForm({ ...form, roles: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">Leave blank to allow all roles</p>
                  </div>
                  <Button onClick={submit} className="w-full">Save</Button>
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
              <Input className="pl-9" placeholder="Search name, emp id, email…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clear}><X className="h-3 w-3 mr-1" />Clear Filters</Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Showing {filtered.length} of {panelists.length} results</div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Emp ID</th>
                  <th className="px-4 py-3 text-left">Designation</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Conducted</th>
                  <th className="px-4 py-3 text-left">Selected</th>
                  <th className="px-4 py-3 text-left">Sel %</th>
                  {isAdmin && <th className="px-4 py-3 text-left"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-muted-foreground">No panelists match the filters.</td></tr>
                ) : filtered.map((p: any, i: number) => {
                  const pct = p.total_interviews ? Math.round((p.total_selected / p.total_interviews) * 100) : 0;
                  const deletePanelist = async () => {
                    if (!confirm(`Delete ${p.name}? This cannot be undone.`)) return;
                    try {
                      await api(`/api/panelists/${p.id}`, { method: "DELETE" });
                      toast.success("Panelist deleted");
                      qc.invalidateQueries({ queryKey: ["panelists"] });
                    } catch (e: any) { toast.error(e.message ?? "Failed to delete"); }
                  };
                  return (
                    <tr key={p.id} className="border-t hover:bg-accent/40">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3">{p.emp_id || "—"}</td>
                      <td className="px-4 py-3">{p.designation || "—"}</td>
                      <td className="px-4 py-3 text-xs">{p.email}</td>
                      <td className="px-4 py-3">{p.total_interviews}</td>
                      <td className="px-4 py-3">{p.total_selected}</td>
                      <td className="px-4 py-3 font-medium">{pct}%</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={deletePanelist} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
