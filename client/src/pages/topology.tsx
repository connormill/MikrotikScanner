import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download, Network as NetworkIcon, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { useEffect, useMemo } from "react";
import type { TopologyData, AsymmetricRoute } from "@shared/schema";

export default function TopologyPage() {
  const { data: topologyData } = useQuery<TopologyData>({
    queryKey: ["/api/topology"],
  });

  const { data: asymmetricRoutes } = useQuery<AsymmetricRoute[]>({
    queryKey: ["/api/topology/asymmetric"],
  });

  const initialNodes: Node[] = useMemo(() => {
    if (!topologyData?.nodes) return [];
    
    return topologyData.nodes.map((node, index) => ({
      id: node.id,
      type: "default",
      position: {
        x: (index % 4) * 250 + 100,
        y: Math.floor(index / 4) * 200 + 100,
      },
      data: {
        label: (
          <div className="text-center p-2">
            <div className="font-mono text-sm font-semibold">{node.ip}</div>
            {node.hostname && (
              <div className="text-xs text-muted-foreground">{node.hostname}</div>
            )}
          </div>
        ),
      },
      style: {
        background: "hsl(var(--card))",
        border: node.status === "online" ? "2px solid hsl(var(--success))" : "2px solid hsl(var(--border))",
        borderRadius: "8px",
        padding: "4px",
        minWidth: "150px",
      },
    }));
  }, [topologyData]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!topologyData?.edges) return [];
    
    return topologyData.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: `${edge.cost}`,
      labelStyle: {
        fill: edge.isAsymmetric ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))",
        fontWeight: edge.isAsymmetric ? 600 : 400,
        fontSize: 12,
      },
      labelBgStyle: {
        fill: "hsl(var(--background))",
        fillOpacity: 0.8,
      },
      style: {
        stroke: edge.isAsymmetric ? "hsl(var(--warning))" : "hsl(var(--primary))",
        strokeWidth: edge.isAsymmetric ? 3 : 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.isAsymmetric ? "hsl(var(--warning))" : "hsl(var(--primary))",
      },
      animated: edge.isAsymmetric,
    }));
  }, [topologyData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const exportTopology = () => {
    const data = JSON.stringify({ nodes: topologyData?.nodes, edges: topologyData?.edges }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topology-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Network Topology</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual representation of your OSPF network with routing weights
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportTopology}
          disabled={!topologyData}
          data-testid="button-export-topology"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {asymmetricRoutes && asymmetricRoutes.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              {asymmetricRoutes.length} Asymmetric Route{asymmetricRoutes.length !== 1 ? 's' : ''} Detected
            </CardTitle>
            <CardDescription>
              Routes with different costs in each direction can cause suboptimal routing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {asymmetricRoutes.map((route, index) => (
                <div
                  key={`${route.router1}-${route.router2}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-warning/30"
                  data-testid={`asymmetric-route-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/10">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-mono text-sm">
                        <span>{route.router1Ip}</span>
                        <span className="text-muted-foreground">↔</span>
                        <span>{route.router2Ip}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cost: {route.cost1to2} → {route.cost2to1} (Δ {route.difference})
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      route.severity === "high"
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : route.severity === "medium"
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-muted text-muted-foreground border-muted-foreground/20"
                    }
                  >
                    {route.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>OSPF Network Graph</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-success" />
                  <span className="text-muted-foreground">Online</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-8 bg-warning rounded" />
                  <span className="text-muted-foreground">Asymmetric</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {topologyData && topologyData.nodes.length > 0 ? (
            <div className="h-[600px] border-t" data-testid="topology-graph">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                attributionPosition="bottom-left"
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center border-t">
              <div className="text-center">
                <NetworkIcon className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No topology data</h3>
                <p className="text-sm text-muted-foreground">
                  Run a network scan to discover routers and build the topology
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
