import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Users, CalendarCheck, ClipboardList, TrendingUp, AlertTriangle, Plus, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "#94a3b8",
  scheduled: "#3b82f6",
  in_progress: "#f59e0b",
  selected: "#10b981",
  rejected: "#ef4444",
  manual_intervention: "#F37021",
};

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<any>("/api/dashboard"),
  });

  const candidates = data?.candidates ?? [];
  const interviews = data?.interviews ?? [];
  const todayInterviews = data?.todayInterviews ?? [];
  const miCount = data?.manualInterventionCount ?? 0;

  const statusCounts = candidates.reduce<Record<string, number>>((a: any, c: any) => {
    a[c.status] = (a[c.status] || 0) + 1;
    return a;
  }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const perDay = last7.map((d) => ({
    day: d.slice(5),
    count: interviews.filter((i: any) => i.scheduled_date === d).length,
  }));

  const byLevel = ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7"].map((lvl) => ({
    level: lvl,
    count: interviews.filter((i: any) => i.candidates?.level_code === lvl).length,
  }));

  const selected = interviews.filter((i: any) => i.result === "selected").length;
  const total = interviews.filter((i: any) => i.result !== "pending").length;
  const selRate = total ? Math.round((selected / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your interview pipeline"
        actions={
          <>
            <Button asChild variant="outline"><Link to="/candidates"><Plus className="h-4 w-4 mr-1" />Add Candidate</Link></Button>
            <Button asChild><Link to="/schedule"><CalendarPlus className="h-4 w-4 mr-1" />Schedule</Link></Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
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
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center pulse-orange">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2">
            <h3 className="font-semibold mb-3">Interviews · Last 7 days</h3>
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
            <h3 className="font-semibold mb-3">Candidate Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                  {statusData.map((e) => <Cell key={e.name} fill={STATUS_COLORS[e.name] ?? "#94a3b8"} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {statusData.map((s) => (
                <span key={s.name} className="text-xs flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.name] }} />
                  {s.name} ({s.value})
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-5 lg:col-span-3">
            <h3 className="font-semibold mb-3">Interviews by Engineering Level</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byLevel}>
                <XAxis dataKey="level" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

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
                    <th className="py-2 pr-4">Level</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Panelist</th>
                    <th className="py-2 pr-4">Round</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayInterviews.map((i: any) => (
                    <tr key={i.id} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="py-2.5 pr-4 font-medium">{i.slot_time}</td>
                      <td className="py-2.5 pr-4">{i.candidates?.name}</td>
                      <td className="py-2.5 pr-4"><span className="px-2 py-0.5 bg-secondary rounded text-xs">{i.candidates?.level_code}</span></td>
                      <td className="py-2.5 pr-4">{i.candidates?.role_applied}</td>
                      <td className="py-2.5 pr-4">{i.panelists?.name ?? "—"}</td>
                      <td className="py-2.5 pr-4">R{i.round_number}</td>
                      <td className="py-2.5 pr-4"><span className="px-2 py-0.5 rounded text-xs capitalize" style={{ background: `${STATUS_COLORS[i.status] ?? "#94a3b8"}22`, color: STATUS_COLORS[i.status] ?? "#94a3b8" }}>{i.status.replace(/_/g, " ")}</span></td>
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
