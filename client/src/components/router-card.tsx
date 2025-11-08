import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Router, Network, MoreVertical, Edit, Trash2, RefreshCw } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { EditRouterDialog } from "./edit-router-dialog";
import type { Router as RouterType } from "@shared/schema";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RouterCardProps {
  router: RouterType;
  onClick?: () => void;
  showActions?: boolean;
}

export function RouterCard({ router, onClick, showActions = true }: RouterCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/routers/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routers"] });
      toast({
        title: "Router deleted",
        description: "The router has been removed from the network.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete router",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const rescanMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/routers/${id}/rescan`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routers"] });
      toast({
        title: "Router rescanned",
        description: "Router information has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rescan failed",
        description: error.message || "Could not connect to router",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate(router.id);
    setShowDeleteDialog(false);
  };

  const handleRescan = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    rescanMutation.mutate(router.id);
  };

  return (
    <>
      <Card
        className={cn(
          "transition-all",
          onClick && "cursor-pointer hover-elevate active-elevate-2"
        )}
        data-testid={`card-router-${router.id}`}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1" onClick={onClick}>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={router.status as any} />
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`button-router-actions-${router.id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditDialog(true);
                    }}
                    data-testid={`button-edit-router-${router.id}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleRescan as any}
                    disabled={rescanMutation.isPending}
                    data-testid={`button-rescan-router-${router.id}`}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", rescanMutation.isPending && "animate-spin")} />
                    {rescanMutation.isPending ? "Rescanning..." : "Rescan"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive"
                    data-testid={`button-delete-router-${router.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2" onClick={onClick}>
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

      <EditRouterDialog
        router={router}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Router</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete router <strong className="font-mono">{router.ip}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
