import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "online" | "offline" | "scanning" | "error" | "unknown";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    online: {
      label: "Online",
      className: "bg-success/10 text-success border-success/20",
    },
    offline: {
      label: "Offline",
      className: "bg-muted text-muted-foreground border-muted-foreground/20",
    },
    scanning: {
      label: "Scanning",
      className: "bg-primary/10 text-primary border-primary/20",
    },
    error: {
      label: "Error",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
    unknown: {
      label: "Unknown",
      className: "bg-muted text-muted-foreground border-muted-foreground/20",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}
