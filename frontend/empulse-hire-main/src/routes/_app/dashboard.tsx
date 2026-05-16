import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, CalendarCheck, ClipboardList, TrendingUp, AlertTriangle, Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

const STATUS_COLORS: Record<string, string> = {
  pending: "#94a3b8",
  scheduled: "#3b82f6",
  in_progress: "#f59e0b",
  done: "#10b981",
  selected: "#10b981",
  rejected: "#ef4444",
  cancelled: "#6b7280",
  manual_intervention: "#F37021",
};

const CHART_COLORS = ["#F37021", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16"];

const INTERVIEW_STATUSES = ["pending", "scheduled", "done", "cancelled"];

function Dashboard() {
  const { isAdmin } = useAuth();

  // Admin filters
  const [hrEmail, setHrEmail] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Main dashboard (today's interviews — never filtered)
  const { data: mainData } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<any>("/api/dashboard"),
  });

  // Admin analytics (drives all stats + charts for admin)
  const adminParams = new URLSearchParams();
  if (hrEmail !== "all") adminParams.set("hrEmail", hrEmail);
  if (statusFilter !== "all") adminParams.set("status", statusFilter);
  if (roleFilter !== "all") adminParams.set("role", roleFilter);
  if (startDate) adminParams.set("startDate", startDate);
  if (endDate) adminParams.set("endDate", endDate);

  const { data: adminData } = useQuery({
    queryKey: ["dashboard-admin", hrEmail, statusFilter, roleFilter, startDate, endDate],
    enabled: isAdmin,
    queryFn: () => api<any>(`/api/dashboard/admin?${adminParams.toString()}`),
  });

  const todayInterviews: any[] = mainData?.todayInterviews ?? [];
  const miCount: number = mainData?.manualInterventionCount ?? 0;

  // For HR: use main API data; for admin: use filtered admin API data
  const interviews: any[] = isAdmin
    ? (adminData?.interviews ?? [])
    : (mainData?.interviews ?? []);
  const candidates: any[] = mainData?.candidates ?? [];

  const hrList: any[] = adminData?.hrList ?? [];
  const roles: string[] = adminData?.roles ?? [];

  // Derived stats
  const selected = interviews.filter((i) => i.result === "selected").length;
  const completed = interviews.filter((i) => i.result !== "pending").length;
  const selRate = completed ? Math.round((selected / completed) * 100) : 0;

  // Last 7 days chart
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const perDay = last7.map((d) => ({
    day: d.slice(5),
    count: interviews.filter((i: any) => (i.scheduled_date ?? "").startsWith(d)).length,
  }));

  // Status distribution (pie)
  const statusCounts = interviews.reduce<Record<string, number>>((a, i: any) => {
    const s = i.status ?? "pending";
    a[s] = (a[s] || 0) + 1;
    return a;
  }, {});
  const statusPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // By HR (bar) — use name resolved on backend from HR collection
  const byhHRCounts = interviews.reduce<Record<string, number>>((a, i: any) => {
    const key = i.added_by_name || i.added_by || "Unknown";
    a[key] = (a[key] || 0) + 1;
    return a;
  }, {});
  const byHRData = Object.entries(byhHRCounts).map(([hr, count]) => ({ hr, count }));

  // By Role (bar)
  const byRoleCounts = interviews.reduce<Record<string, number>>((a, i: any) => {
    const key = i.role_applied ?? i.candidates?.role_applied ?? "Unknown";
    a[key] = (a[key] || 0) + 1;
    return a;
  }, {});
  const byRoleData = Object.entries(byRoleCounts).map(([role, count]) => ({ role, count }));

  const clearFilters = () => {
    setHrEmail("all"); setStatusFilter("all"); setRoleFilter("all");
    setStartDate(""); setEndDate("");
  };

  const hasFilters = hrEmail !== "all" || statusFilter !== "all" || roleFilter !== "all" || startDate || endDate;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your interview pipeline"
        actions={null}
      />

      <div className="p-6 space-y-6">

        {/* ── Admin Filters (top, always visible for admin) ── */}
        {isAdmin && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Filter Dashboard</h3>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" />Clear Filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">HR</Label>
                <Select value={hrEmail} onValueChange={setHrEmail}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {hrList.map((h: any) => (
                      <SelectItem key={h.email} value={h.email}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Interview Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {INTERVIEW_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Role Applied</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date Range</Label>
                <div className="flex gap-1">
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs" />
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs" />
                </div>
              </div>
            </div>
            {hasFilters && (
              <p className="text-xs text-muted-foreground mt-2">{interviews.length} interview{interviews.length !== 1 ? "s" : ""} match current filters</p>
            )}
          </Card>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Candidates" value={candidates.length} tone="primary" />
          <StatCard icon={ClipboardList} label="Total Interviews" value={interviews.length} tone="info" />
          <StatCard icon={CalendarCheck} label="Interviews Today" value={todayInterviews.length} tone="warning" />
          <StatCard icon={TrendingUp} label="Selection Rate" value={`${selRate}%`} tone="success" />
        </div>

        {miCount > 0 && (
          <Link to="/interventions">
            <Card className="p-4 border-primary/40 bg-primary/5 hover:bg-primary/10 transition flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">Manual Intervention Required</div>
                  <div className="text-sm text-muted-foreground">{miCount} candidate{miCount > 1 ? "s" : ""} need HR attention</div>
                </div>
              </div>
              <span className="text-primary font-medium text-sm">Review →</span>
            </Card>
          </Link>
        )}

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Interviews · Last 7 Days</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perDay}>
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-3">Interview Status Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {statusPieData.map((e) => <Cell key={e.name} fill={STATUS_COLORS[e.name] ?? "#94a3b8"} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-1">
              {statusPieData.map((s) => (
                <span key={s.name} className="text-xs flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.name] }} />
                  {s.name} ({s.value})
                </span>
              ))}
            </div>
          </Card>

          {/* Admin-only charts */}
          {isAdmin && byHRData.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Interviews by HR</h3>
              <ResponsiveContainer width="100%" height={Math.max(220, byHRData.length * 48)}>
                <BarChart data={byHRData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="hr"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    width={Math.min(180, Math.max(80, Math.max(...byHRData.map(d => d.hr.length)) * 8))}
                    tick={{ fill: "var(--foreground)" }}
                  />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {byHRData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {isAdmin && byRoleData.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Interviews by Role Applied</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byRoleData} layout="vertical">
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="role" stroke="var(--muted-foreground)" fontSize={11} width={130} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {byRoleData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* ── Today's Interviews (never filtered) ── */}
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Today's Interviews</h3>
          {todayInterviews.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No interviews scheduled for today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                    <th className="py-2 pr-4">Slot</th>
                    <th className="py-2 pr-4">Candidate</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Panelist</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayInterviews.map((i: any) => (
                    <tr key={i.id} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="py-2.5 pr-4 font-medium">{i.slot_time}</td>
                      <td className="py-2.5 pr-4">{i.candidates?.name || "—"}</td>
                      <td className="py-2.5 pr-4">{i.candidates?.role_applied || "—"}</td>
                      <td className="py-2.5 pr-4">{i.panelists?.name ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <span className="px-2 py-0.5 rounded text-xs capitalize" style={{ background: `${STATUS_COLORS[i.status] ?? "#94a3b8"}22`, color: STATUS_COLORS[i.status] ?? "#94a3b8" }}>
                          {i.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone: "primary" | "info" | "warning" | "success" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    info: "bg-blue-500/10 text-blue-600",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/15 text-success",
  };
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
