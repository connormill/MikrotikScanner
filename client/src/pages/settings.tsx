import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Save, CheckCircle2, XCircle, Loader2, Power, Wifi, Server } from "lucide-react";
import type { Settings as SettingsType } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authKey, setAuthKey] = useState("");
  const [sshEnabled, setSshEnabled] = useState(false);
  const [sshHost, setSshHost] = useState("");
  const [sshUsername, setSshUsername] = useState("");
  const [sshPassword, setSshPassword] = useState("");

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

  const { data: sshTunnelStatus } = useQuery<{
    connected: boolean;
    host: string;
  }>({
    queryKey: ["/api/ssh-tunnel/status"],
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

  const saveSSHTunnelMutation = useMutation({
    mutationFn: async (data: { enabled: boolean; host: string; username: string; password: string }) => {
      return apiRequest("POST", "/api/settings/ssh-tunnel", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "SSH tunnel configured",
        description: "SSH tunnel settings have been saved",
      });
      setSshPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const connectSSHTunnelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/ssh-tunnel/connect", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ssh-tunnel/status"] });
      toast({
        title: "SSH tunnel connected",
        description: "Successfully established SSH tunnel connection",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect SSH tunnel",
        variant: "destructive",
      });
    },
  });

  const disconnectSSHTunnelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/ssh-tunnel/disconnect", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ssh-tunnel/status"] });
      toast({
        title: "SSH tunnel disconnected",
        description: "SSH tunnel connection closed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnection failed",
        description: error.message || "Failed to disconnect SSH tunnel",
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

  const handleSaveSSHTunnel = () => {
    if (sshEnabled && (!sshHost || !sshUsername || !sshPassword)) {
      toast({
        title: "Missing credentials",
        description: "Please enter SSH host, username, and password",
        variant: "destructive",
      });
      return;
    }
    saveSSHTunnelMutation.mutate({
      enabled: sshEnabled,
      host: sshHost || settings?.sshTunnelHost || "",
      username: sshUsername || settings?.sshTunnelUsername || "",
      password: sshPassword,
    });
  };

  const handleConnect = () => {
    connectTailscaleMutation.mutate(authKey);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure SSH tunnel, Tailscale connection, and MikroTik router credentials
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
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            SSH Tunnel
          </CardTitle>
          <CardDescription>
            Establish SSH tunnel through bastion host to access MikroTik routers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ssh-enabled">Enable SSH Tunnel</Label>
              <p className="text-xs text-muted-foreground">
                Required for Replit environment to bypass networking limitations
              </p>
            </div>
            <Switch
              id="ssh-enabled"
              checked={sshEnabled || settings?.sshTunnelEnabled || false}
              onCheckedChange={setSshEnabled}
              data-testid="switch-ssh-enabled"
            />
          </div>

          {(sshEnabled || settings?.sshTunnelEnabled) && (
            <>
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Connection Status</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      SSH tunnel to bastion host
                    </p>
                  </div>
                  {sshTunnelStatus?.connected ? (
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

                {sshTunnelStatus?.connected && sshTunnelStatus.host && (
                  <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                    <p className="text-sm text-muted-foreground">SSH Host</p>
                    <p className="font-mono text-sm font-medium mt-1">{sshTunnelStatus.host}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="sshHost">Bastion Host</Label>
                    <Input
                      id="sshHost"
                      type="text"
                      placeholder="100.74.182.78"
                      value={sshHost || settings?.sshTunnelHost || ""}
                      onChange={(e) => setSshHost(e.target.value)}
                      data-testid="input-ssh-host"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sshUsername">SSH Username</Label>
                    <Input
                      id="sshUsername"
                      type="text"
                      placeholder="root"
                      value={sshUsername || settings?.sshTunnelUsername || ""}
                      onChange={(e) => setSshUsername(e.target.value)}
                      data-testid="input-ssh-username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sshPassword">SSH Password</Label>
                    <Input
                      id="sshPassword"
                      type="password"
                      placeholder="Enter SSH password"
                      value={sshPassword}
                      onChange={(e) => setSshPassword(e.target.value)}
                      data-testid="input-ssh-password"
                    />
                  </div>

                  <Button
                    onClick={handleSaveSSHTunnel}
                    disabled={saveSSHTunnelMutation.isPending}
                    variant="outline"
                    className="w-full"
                    data-testid="button-save-ssh-config"
                  >
                    {saveSSHTunnelMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save SSH Configuration
                      </>
                    )}
                  </Button>

                  {!sshTunnelStatus?.connected && (
                    <Button
                      onClick={() => connectSSHTunnelMutation.mutate()}
                      disabled={connectSSHTunnelMutation.isPending}
                      className="w-full"
                      data-testid="button-connect-ssh"
                    >
                      {connectSSHTunnelMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Server className="mr-2 h-4 w-4" />
                          Connect SSH Tunnel
                        </>
                      )}
                    </Button>
                  )}

                  {sshTunnelStatus?.connected && (
                    <Button
                      onClick={() => disconnectSSHTunnelMutation.mutate()}
                      disabled={disconnectSSHTunnelMutation.isPending}
                      variant="outline"
                      className="w-full"
                      data-testid="button-disconnect-ssh"
                    >
                      {disconnectSSHTunnelMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Disconnect SSH Tunnel
                        </>
                      )}
                    </Button>
                  )}
                </div>
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
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm">SSH Tunnel</span>
            <Badge variant="outline">
              {sshTunnelStatus?.connected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
