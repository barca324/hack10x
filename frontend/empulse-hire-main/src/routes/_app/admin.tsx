import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, normalizeHR } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", designation: "", level_code: "E2", role: "hr" });
  const [q, setQ] = useState("");
  const [desigFilter, setDesigFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: users = [] } = useQuery({
    queryKey: ["allowed-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const raw = await api<any[]>("/api/admin/hr");
      return raw.map(normalizeHR);
    },
  });

  const designations = useMemo(() => Array.from(new Set((users as any[]).map((u) => u.designation).filter(Boolean))), [users]);

  const filteredUsers = (users as any[]).filter((u) => {
    if (desigFilter !== "all" && u.designation !== desigFilter) return false;
    if (activeFilter === "active" && !u.is_active) return false;
    if (activeFilter === "inactive" && u.is_active) return false;
    if (q && !`${u.name} ${u.email} ${u.designation ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  const addUser = async () => {
    try {
      await api("/api/admin/hr", {
        method: "POST",
        body: JSON.stringify({ name: form.name, email: form.email, designation: form.designation, rolesResponsibleFor: [] }),
      });
      toast.success("User added. They can now sign in with Google.");
      setForm({ name: "", email: "", designation: "", level_code: "E2", role: "hr" });
      qc.invalidateQueries({ queryKey: ["allowed-users"] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <div>
      <PageHeader title="Admin Panel" subtitle="Manage users, mappings and system config" />
      <div className="p-6">
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">HR Users</TabsTrigger>
            <TabsTrigger value="levels">Levels</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Add Recruiter / Admin</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="panelist">Panelist</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addUser}>Add</Button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex gap-3 flex-wrap items-center">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search name, email…" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <Select value={desigFilter} onValueChange={setDesigFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Designation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All designations</SelectItem>
                    {designations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => { setQ(""); setDesigFilter("all"); setActiveFilter("all"); }}>
                  <X className="h-3 w-3 mr-1" />Clear Filters
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-2">Showing {filteredUsers.length} of {users.length} results</div>
            </Card>

            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Designation</th>
                    <th className="px-4 py-3 text-left">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No users found.</td></tr>
                  ) : filteredUsers.map((u: any) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{u.designation || "—"}</td>
                      <td className="px-4 py-3">{u.is_active ? "✅" : "❌"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="levels">
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Engineering Levels (E0–E7)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7"].map((c) => (
                  <div key={c} className="border rounded-lg p-3">
                    <div className="font-bold text-primary">{c}</div>
                    <div className="text-xs text-muted-foreground">{{ E0: "Intern", E1: "Software Engineer", E2: "Senior SE", E3: "Lead Engineer", E4: "Principal Engineer", E5: "Eng Manager", E6: "Sr Eng Manager", E7: "HOD" }[c]}</div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="p-12 text-center text-muted-foreground">Audit logs will appear here as actions are taken.</Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
