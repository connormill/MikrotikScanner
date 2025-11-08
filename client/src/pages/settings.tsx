import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Save, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { Settings as SettingsType } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { data: settings } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  const { data: tailscaleStatus } = useQuery<{ connected: boolean; ip?: string }>({
    queryKey: ["/api/tailscale/status"],
    refetchInterval: 10000,
  });

  const connectTailscaleMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/tailscale/connect", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tailscale/status"] });
      toast({
        title: "Tailscale connected",
        description: "Successfully connected to your Tailscale network",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Tailscale",
        variant: "destructive",
      });
    },
  });

  const saveCredentialsMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      return apiRequest("POST", "/api/settings/credentials", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Credentials saved",
        description: "Mikrotik credentials have been updated",
      });
      setPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSaveCredentials = () => {
    if (!username || !password) {
      toast({
        title: "Missing credentials",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }
    saveCredentialsMutation.mutate({ username, password });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure Tailscale connection and Mikrotik router credentials
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Tailscale Connection
              </CardTitle>
              <CardDescription className="mt-2">
                Connect to your network via Tailscale VPN
              </CardDescription>
            </div>
            {tailscaleStatus?.connected ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20">
                <XCircle className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tailscaleStatus?.connected && tailscaleStatus.ip && (
            <div className="p-4 rounded-lg bg-success/5 border border-success/20">
              <p className="text-sm text-muted-foreground">Tailscale IP</p>
              <p className="font-mono text-sm font-medium mt-1">{tailscaleStatus.ip}</p>
            </div>
          )}
          
          <Button
            onClick={() => connectTailscaleMutation.mutate()}
            disabled={connectTailscaleMutation.isPending || tailscaleStatus?.connected}
            data-testid="button-connect-tailscale"
          >
            {connectTailscaleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : tailscaleStatus?.connected ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Connected
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Connect to Tailscale
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mikrotik Credentials</CardTitle>
          <CardDescription>
            Set default username and password for connecting to your Mikrotik routers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="admin"
              value={username || settings?.mikrotikUsername || ""}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="input-mikrotik-username"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-mikrotik-password"
            />
          </div>

          <Button
            onClick={handleSaveCredentials}
            disabled={saveCredentialsMutation.isPending}
            data-testid="button-save-credentials"
          >
            {saveCredentialsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Credentials
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            These credentials are stored securely and used for all router connections
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
          <CardDescription>
            Current environment configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm">Mikrotik Username</span>
            <Badge variant="outline">
              {settings?.mikrotikUsername ? "Configured" : "Not set"}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm">Mikrotik Password</span>
            <Badge variant="outline">
              {settings?.mikrotikPassword ? "Configured" : "Not set"}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm">Tailscale Auth Key</span>
            <Badge variant="outline">Configured</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
