import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Router, Network } from "lucide-react";
import { StatusBadge } from "./status-badge";
import type { Router as RouterType } from "@shared/schema";

interface RouterCardProps {
  router: RouterType;
  onClick?: () => void;
}

export function RouterCard({ router, onClick }: RouterCardProps) {
  return (
    <Card
      className={cn(
        "transition-all",
        onClick && "cursor-pointer hover-elevate active-elevate-2"
      )}
      onClick={onClick}
      data-testid={`card-router-${router.id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Router className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-medium truncate" data-testid={`text-router-ip-${router.id}`}>
              {router.ip}
            </p>
            {router.hostname && (
              <p className="text-xs text-muted-foreground truncate">
                {router.hostname}
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={router.status as any} />
      </CardHeader>
      <CardContent className="space-y-2">
        {router.identity && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Identity:</span>
            <span className="font-medium truncate ml-2">{router.identity}</span>
          </div>
        )}
        {router.version && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Version:</span>
            <span className="font-medium truncate ml-2">{router.version}</span>
          </div>
        )}
        {router.ospfNeighbors && router.ospfNeighbors.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Network className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {router.ospfNeighbors.length} OSPF neighbor{router.ospfNeighbors.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
