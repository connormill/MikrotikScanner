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

  private async ensureDaemonRunning(): Promise<void> {
    try {
      await execAsync(`tailscale --socket=${this.socketPath} status`);
    } catch {
      console.log("Starting Tailscale daemon...");
      await execAsync(
        `mkdir -p /tmp/tailscale && nohup tailscaled --state=/tmp/tailscale/tailscaled.state --socket=${this.socketPath} --tun=userspace-networking > /tmp/tailscale/daemon.log 2>&1 &`
      );
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
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
        `tailscale --socket=${this.socketPath} up --authkey=${this.authKey} --accept-routes --timeout=10s`
      );
      
      if (stderr && stderr.includes("error")) {
        throw new Error(stderr);
      }
    } catch (error: any) {
      console.error("Tailscale connection error:", error);
      
      if (error.message.includes("already logged in")) {
        return;
      }
      
      if (error.message.includes("auth key")) {
        throw new Error("Invalid Tailscale auth key. Please check your TAILSCALE_AUTH_KEY.");
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
