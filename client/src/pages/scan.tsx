import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RouterCard } from "@/components/router-card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { Router as RouterType, Scan as ScanType, InsertScan } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScanSchema } from "@shared/schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function ScanPage() {
  const { toast } = useToast();
  const [activeScan, setActiveScan] = useState<ScanType | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  const form = useForm<InsertScan>({
    resolver: zodResolver(insertScanSchema),
    defaultValues: {
      subnet: "",
      status: "pending",
    },
  });

  const { data: routers } = useQuery<RouterType[]>({
    queryKey: ["/api/routers"],
  });

  const { data: scans } = useQuery<ScanType[]>({
    queryKey: ["/api/scans"],
  });

  const scanMutation = useMutation({
    mutationFn: async (data: InsertScan) => {
      return apiRequest("POST", "/api/scans", data);
    },
    onSuccess: (scan: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      setActiveScan(scan);
      setScanProgress(0);
      toast({
        title: "Scan started",
        description: `Scanning subnet ${scan.subnet}`,
      });
      
      const eventSource = new EventSource(`/api/scans/${scan.id}/progress`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setScanProgress(data.progress);
        
        if (data.status === "completed") {
          eventSource.close();
          queryClient.invalidateQueries({ queryKey: ["/api/routers"] });
          queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
          queryClient.invalidateQueries({ queryKey: ["/api/topology"] });
          queryClient.invalidateQueries({ queryKey: ["/api/topology/asymmetric"] });
          setActiveScan(null);
          toast({
            title: "Scan completed",
            description: `Found ${data.routersFound} routers${data.asymmetriesFound > 0 ? `, ${data.asymmetriesFound} asymmetric routes detected` : ""}`,
          });
        }
        
        if (data.status === "error") {
          eventSource.close();
          setActiveScan(null);
          toast({
            title: "Scan failed",
            description: data.error || "Unable to connect to routers. In development, demo data is available on the dashboard.",
            variant: "destructive",
          });
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
        setActiveScan(null);
        toast({
          title: "Connection lost",
          description: "Lost connection to scan progress. Check the scan history for results.",
          variant: "destructive",
        });
      };
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start scan",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertScan) => {
    scanMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Network Scanner</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scan subnets to discover Mikrotik routers and analyze OSPF neighbors
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan Configuration</CardTitle>
          <CardDescription>
            Enter a subnet in CIDR notation (e.g., 192.168.1.0/24) to discover routers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="subnet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subnet (CIDR)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="192.168.1.0/24"
                        className="font-mono"
                        data-testid="input-subnet"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Specify the network range to scan for Mikrotik devices
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                disabled={scanMutation.isPending || !!activeScan}
                data-testid="button-start-scan"
              >
                {scanMutation.isPending || activeScan ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Start Scan
                  </>
                )}
              </Button>
            </form>
          </Form>

          {activeScan && (
            <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Scanning {activeScan.subnet}</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  In Progress
                </Badge>
              </div>
              <Progress value={scanProgress} className="h-2" data-testid="progress-scan" />
              <p className="text-xs text-muted-foreground">
                {scanProgress}% complete
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discovered Routers</CardTitle>
          <CardDescription>
            {routers?.length || 0} router{routers?.length !== 1 ? 's' : ''} found in your network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {routers && routers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {routers.map((router) => (
                <RouterCard key={router.id} router={router} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Search className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No routers discovered</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start a scan to discover Mikrotik routers in your network
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {scans && scans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scan History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  data-testid={`scan-history-${scan.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                      {scan.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : scan.status === "error" ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium">{scan.subnet}</p>
                      <p className="text-xs text-muted-foreground">
                        {scan.startedAt ? new Date(scan.startedAt).toLocaleString() : "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-sm font-medium">{scan.routersFound || 0} routers</p>
                      {(scan.asymmetriesFound || 0) > 0 && (
                        <div className="flex items-center gap-1 text-xs text-warning">
                          <AlertTriangle className="h-3 w-3" />
                          {scan.asymmetriesFound} asymmetric
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
