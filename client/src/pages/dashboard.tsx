import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/metric-card";
import { RouterCard } from "@/components/router-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Router, AlertTriangle, Activity, Clock, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Router as RouterType, Scan } from "@shared/schema";

export default function Dashboard() {
  const { data: routers, isLoading: routersLoading } = useQuery<RouterType[]>({
    queryKey: ["/api/routers"],
  });

  const { data: recentScans, isLoading: scansLoading } = useQuery<Scan[]>({
    queryKey: ["/api/scans/recent"],
  });

  const onlineRouters = routers?.filter((r) => r.status === "online").length || 0;
  const totalRouters = routers?.length || 0;
  const lastScan = recentScans?.[0];
  const asymmetries = lastScan?.asymmetriesFound || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Network Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your Mikrotik router network and OSPF topology
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Routers"
          value={totalRouters}
          icon={Router}
          description={`${onlineRouters} online`}
        />
        <MetricCard
          title="Online Routers"
          value={onlineRouters}
          icon={Activity}
          description={`${totalRouters - onlineRouters} offline`}
        />
        <MetricCard
          title="Asymmetric Routes"
          value={asymmetries}
          icon={AlertTriangle}
          description={asymmetries > 0 ? "Issues detected" : "All routes symmetric"}
        />
        <MetricCard
          title="Last Scan"
          value={lastScan ? new Date(lastScan.startedAt).toLocaleDateString() : "Never"}
          icon={Clock}
          description={lastScan ? new Date(lastScan.startedAt).toLocaleTimeString() : "Run your first scan"}
        />
      </div>

      {asymmetries > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Asymmetric Routing Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {asymmetries} asymmetric route{asymmetries !== 1 ? 's' : ''} detected in your network. 
              These can cause suboptimal routing and performance issues.
            </p>
            <Link href="/topology">
              <Button variant="outline" size="sm" data-testid="button-view-topology">
                View Topology
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>Recent Routers</CardTitle>
            <Link href="/scan">
              <Button variant="ghost" size="sm" data-testid="button-view-all-routers">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {routersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : routers && routers.length > 0 ? (
              <div className="space-y-3">
                {routers.slice(0, 3).map((router) => (
                  <RouterCard key={router.id} router={router} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Router className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No routers discovered yet</p>
                <Link href="/scan">
                  <Button variant="outline" size="sm" className="mt-4" data-testid="button-start-scan">
                    Start a Scan
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>Recent Scans</CardTitle>
            <Link href="/scan">
              <Button variant="ghost" size="sm" data-testid="button-view-scan-history">
                View History
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {scansLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : recentScans && recentScans.length > 0 ? (
              <div className="space-y-3">
                {recentScans.slice(0, 5).map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`scan-item-${scan.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium">{scan.subnet}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(scan.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium">{scan.routersFound} routers</p>
                      {scan.asymmetriesFound > 0 && (
                        <p className="text-xs text-warning">
                          {scan.asymmetriesFound} issue{scan.asymmetriesFound !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No scans performed yet</p>
                <Link href="/scan">
                  <Button variant="outline" size="sm" className="mt-4" data-testid="button-create-scan">
                    Create Scan
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
