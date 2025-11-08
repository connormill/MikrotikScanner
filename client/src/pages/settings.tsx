import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Save, CheckCircle2, XCircle, Loader2, Power, Wifi } from "lucide-react";
import type { Settings as SettingsType } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authKey, setAuthKey] = useState("");

  const { data: settings } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  const { data: daemonStatus } = useQuery<{ running: boolean; error?: string }>({
    queryKey: ["/api/tailscale/daemon/status"],
    refetchInterval: 5000,
  });

  const { data: tailscaleStatus } = useQuery<{ 
    connected: boolean; 
    daemonRunning: boolean;
    ip?: string; 
    error?: string 
  }>({
    queryKey: ["/api/tailscale/status"],
    refetchInterval: 10000,
  });

  const startDaemonMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/tailscale/daemon/start", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tailscale/daemon/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tailscale/status"] });
      toast({
        title: "Daemon started",
        description: "Tailscale daemon is now running",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start daemon",
        description: error.message || "Failed to start Tailscale daemon",
        variant: "destructive",
      });
    },
  });

  const connectTailscaleMutation = useMutation({
    mutationFn: async (key: string) => {
      return apiRequest("POST", "/api/tailscale/connect", { authKey: key });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tailscale/status"] });
      toast({
        title: "Network connected",
        description: "Successfully connected to your Tailscale network",
      });
      setAuthKey("");
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Tailscale network",
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

  const handleConnect = () => {
    connectTailscaleMutation.mutate(authKey);
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
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Tailscale VPN
          </CardTitle>
          <CardDescription>
            Connect to your network infrastructure via Tailscale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daemon Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Power className="h-4 w-4" />
                  Daemon Service
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  The background service must be running first
                </p>
              </div>
              {daemonStatus?.running ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20">
                  <XCircle className="h-3 w-3 mr-1" />
                  Stopped
                </Badge>
              )}
            </div>

            {daemonStatus?.error && (
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-sm text-destructive">{daemonStatus.error}</p>
              </div>
            )}

            {!daemonStatus?.running && !daemonStatus?.error && (
              <Button
                onClick={() => startDaemonMutation.mutate()}
                disabled={startDaemonMutation.isPending}
                variant="outline"
                className="w-full"
                data-testid="button-start-daemon"
              >
                {startDaemonMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting daemon...
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Start Tailscale Daemon
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Connection Section - Only shown when daemon is running */}
          {daemonStatus?.running && (
            <>
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      Network Connection
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Connect to your Tailscale network
                    </p>
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

                {tailscaleStatus?.connected && tailscaleStatus.ip && (
                  <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                    <p className="text-sm text-muted-foreground">Tailscale IP</p>
                    <p className="font-mono text-sm font-medium mt-1">{tailscaleStatus.ip}</p>
                  </div>
                )}

                {!tailscaleStatus?.connected && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50 border border-muted">
                      <p className="text-xs text-muted-foreground">
                        You can use the auth key configured in Replit Secrets, or enter a new one below to override it.{" "}
                        <a
                          href="https://login.tailscale.com/admin/settings/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium"
                          data-testid="link-generate-authkey"
                        >
                          Generate a new auth key →
                        </a>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="authKey">Auth Key (Optional)</Label>
                      <Input
                        id="authKey"
                        type="password"
                        placeholder="Leave blank to use configured key, or enter tskey-auth-xxxxx"
                        value={authKey}
                        onChange={(e) => setAuthKey(e.target.value)}
                        disabled={connectTailscaleMutation.isPending}
                        data-testid="input-tailscale-authkey"
                      />
                    </div>

                    <Button
                      onClick={handleConnect}
                      disabled={connectTailscaleMutation.isPending}
                      className="w-full"
                      data-testid="button-connect-network"
                    >
                      {connectTailscaleMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wifi className="mr-2 h-4 w-4" />
                          Connect to Network
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
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
            <span className="text-sm">Tailscale Daemon</span>
            <Badge variant="outline">
              {daemonStatus?.running ? "Running" : "Stopped"}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm">Tailscale Network</span>
            <Badge variant="outline">
              {tailscaleStatus?.connected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
