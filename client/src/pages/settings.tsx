import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Save, Loader2 } from "lucide-react";
import type { Settings as SettingsType } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { data: settings } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  const saveCredentialsMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      return apiRequest("POST", "/api/settings/credentials", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Credentials saved",
        description: "MikroTik credentials have been updated",
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
    const usernameToSave = username || settings?.mikrotikUsername;
    const passwordToSave = password;

    if (!usernameToSave || !passwordToSave) {
      toast({
        title: "Missing information",
        description: "Please provide both username and password",
        variant: "destructive",
      });
      return;
    }

    saveCredentialsMutation.mutate({
      username: usernameToSave,
      password: passwordToSave,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground mt-2" data-testid="text-settings-description">
            Configure your MikroTik router credentials
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              MikroTik Credentials
            </CardTitle>
            <CardDescription>
              Default credentials used to connect to all MikroTik routers on your network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder={settings?.mikrotikUsername || "admin"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-mikrotik-username"
              />
              <p className="text-xs text-muted-foreground">
                Current: {settings?.mikrotikUsername || "Not set"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-mikrotik-password"
              />
              <p className="text-xs text-muted-foreground">
                Password is stored securely and never displayed
              </p>
            </div>

            <Button
              onClick={handleSaveCredentials}
              disabled={saveCredentialsMutation.isPending}
              className="w-full"
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
          </CardContent>
        </Card>

        <Card className="border-muted-foreground/20">
          <CardHeader>
            <CardTitle className="text-base">Environment Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Environment variables:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                MIKROTIK_USERNAME, MIKROTIK_PASSWORD
              </code>
            </div>
            <p className="text-xs text-muted-foreground">
              These credentials are used as defaults when connecting to routers. You can override
              them here or set them via environment variables when deploying.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
