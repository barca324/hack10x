import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/interventions")({ component: InterventionsPage });

function InterventionsPage() {
  const { data: mis = [] } = useQuery({
    queryKey: ["mis"],
    queryFn: () => api<any[]>("/api/manual-interventions"),
  });
  const { data: notifs = [] } = useQuery({
    queryKey: ["notifs"],
    queryFn: () => api<any[]>("/api/notifications"),
  });

  return (
    <div>
      <PageHeader title="Notifications & Interventions" />
      <div className="p-6">
        <Tabs defaultValue="mi">
          <TabsList>
            <TabsTrigger value="mi">Manual Interventions ({mis.length})</TabsTrigger>
            <TabsTrigger value="notifs">Notifications ({notifs.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="mi">
            <Card className="p-4">
              {mis.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No open interventions. Great work!</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2">Candidate</th>
                      <th className="text-left py-2">Level</th>
                      <th className="text-left py-2">Round</th>
                      <th className="text-left py-2">Reason</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mis.map((m: any) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{m.candidates?.name}</td>
                        <td className="py-3">{m.candidates?.level_code}</td>
                        <td className="py-3">R{m.round_number}</td>
                        <td className="py-3 text-muted-foreground">{m.reason}</td>
                        <td className="py-3 capitalize"><span className="px-2 py-0.5 bg-primary/15 text-primary rounded text-xs">{m.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </TabsContent>
          <TabsContent value="notifs">
            <Card className="p-4">
              {notifs.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No notifications yet.</p>
              ) : (
                <ul className="divide-y">
                  {notifs.map((n: any) => (
                    <li key={n.id} className="py-3 flex justify-between items-center">
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">{n.type}</div>
                        <div className="text-sm">{n.message}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
