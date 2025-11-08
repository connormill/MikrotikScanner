import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Router } from "@shared/schema";

interface EditRouterDialogProps {
  router: Router;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRouterDialog({ router, open, onOpenChange }: EditRouterDialogProps) {
  const [hostname, setHostname] = useState(router.hostname || "");
  const [identity, setIdentity] = useState(router.identity || "");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setHostname(router.hostname || "");
      setIdentity(router.identity || "");
    }
  }, [open, router]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Router>) => {
      return apiRequest("PUT", `/api/routers/${router.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routers"] });
      toast({
        title: "Router updated",
        description: "Router information has been saved.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      hostname: hostname.trim() || null,
      identity: identity.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-edit-router">
        <DialogHeader>
          <DialogTitle>Edit Router</DialogTitle>
          <DialogDescription>
            Update router information for <strong className="font-mono">{router.ip}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ip">IP Address</Label>
            <Input
              id="ip"
              value={router.ip}
              disabled
              className="font-mono"
              data-testid="input-router-ip"
            />
            <p className="text-xs text-muted-foreground">IP address cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hostname">Hostname</Label>
            <Input
              id="hostname"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="router-core-01"
              className="font-mono"
              data-testid="input-router-hostname"
            />
            <p className="text-xs text-muted-foreground">Friendly name for the router</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="identity">Identity</Label>
            <Input
              id="identity"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="Core Router 1"
              data-testid="input-router-identity"
            />
            <p className="text-xs text-muted-foreground">Router identity from system</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-save-router"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
