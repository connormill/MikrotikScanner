import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class TailscaleManager {
  private authKey: string;
  private socketPath: string;

  constructor(authKey: string, socketPath: string = "/tmp/tailscale/tailscaled.sock") {
    this.authKey = authKey;
    this.socketPath = socketPath;
  }

  private async checkTailscaleInstalled(): Promise<boolean> {
    try {
      await execAsync("which tailscale");
      return true;
    } catch {
      return false;
    }
  }

  private async isDaemonResponsive(): Promise<boolean> {
    try {
      await execAsync(`tailscale --socket=${this.socketPath} status`);
      return true;
    } catch (error: any) {
      if (error.stdout?.includes("Logged out") || error.stderr?.includes("Logged out")) {
        return true;
      }
      return false;
    }
  }

  private async ensureDaemonRunning(): Promise<void> {
    if (await this.isDaemonResponsive()) {
      return;
    }
    
    console.log("Starting Tailscale daemon...");
    
    try {
      await execAsync(`pkill -f 'tailscaled.*${this.socketPath}'`);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch {
      // Ignore errors if no daemon was running
    }
    
    await execAsync(`rm -f ${this.socketPath}`);
    
    await execAsync(
      `mkdir -p /tmp/tailscale && nohup tailscaled --state=/tmp/tailscale/tailscaled.state --socket=${this.socketPath} --tun=userspace-networking > /tmp/tailscale/daemon.log 2>&1 &`
    );
    
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (await this.isDaemonResponsive()) {
        console.log("Tailscale daemon is ready");
        return;
      }
      console.log(`Waiting for daemon to start (${i + 1}/10)...`);
    }
    
    throw new Error("Tailscale daemon failed to start after 10 seconds");
  }

  async connect(): Promise<void> {
    const isInstalled = await this.checkTailscaleInstalled();
    if (!isInstalled) {
      throw new Error("Tailscale is not installed on this system. Please install Tailscale to use VPN connectivity.");
    }

    if (!this.authKey) {
      throw new Error("Tailscale auth key is not configured. Please set TAILSCALE_AUTH_KEY environment variable.");
    }

    await this.ensureDaemonRunning();

    try {
      const { stdout, stderr } = await execAsync(
        `tailscale --socket=${this.socketPath} up --authkey=${this.authKey} --accept-routes --timeout=30s`
      );
      
      if (stderr && stderr.includes("error")) {
        throw new Error(stderr);
      }
      
      console.log("Successfully connected to Tailscale network");
    } catch (error: any) {
      console.error("Tailscale connection error:", error);
      
      if (error.message.includes("already logged in") || error.message.includes("already connected")) {
        console.log("Already logged in to Tailscale");
        return;
      }
      
      if (error.message.includes("invalid key") || error.message.includes("unable to validate API key")) {
        throw new Error("Invalid or expired Tailscale auth key. Please generate a new auth key at https://login.tailscale.com/admin/settings/keys and update the TAILSCALE_AUTH_KEY secret in Replit.");
      }
      
      if (error.message.includes("timeout waiting")) {
        throw new Error("Tailscale connection timeout. The service is starting but taking longer than expected. Please wait a moment and try again.");
      }
      
      throw new Error(`Failed to connect to Tailscale: ${error.message}`);
    }
  }

  async getStatus(): Promise<{ connected: boolean; ip?: string; error?: string }> {
    const isInstalled = await this.checkTailscaleInstalled();
    if (!isInstalled) {
      return { 
        connected: false, 
        error: "Tailscale is not installed" 
      };
    }

    await this.ensureDaemonRunning();

    try {
      const { stdout } = await execAsync(`tailscale --socket=${this.socketPath} status --json`);
      const status = JSON.parse(stdout);
      
      const self = status.Self;
      if (self && self.Online) {
        return {
          connected: true,
          ip: self.TailscaleIPs?.[0] || undefined,
        };
      }
      
      return { connected: false };
    } catch (error: any) {
      console.error("Tailscale status check error:", error);
      return { 
        connected: false,
        error: error.message 
      };
    }
  }

  async disconnect(): Promise<void> {
    const isInstalled = await this.checkTailscaleInstalled();
    if (!isInstalled) {
      throw new Error("Tailscale is not installed on this system.");
    }

    await this.ensureDaemonRunning();

    try {
      await execAsync(`tailscale --socket=${this.socketPath} down`);
    } catch (error: any) {
      throw new Error(`Failed to disconnect from Tailscale: ${error.message}`);
    }
  }
}
