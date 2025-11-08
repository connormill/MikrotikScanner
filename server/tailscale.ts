import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class TailscaleManager {
  private authKey: string;
  private socketPath: string;
  private socksPort: number = 1055;

  constructor(authKey: string, socketPath: string = "/tmp/tailscale/tailscaled.sock") {
    this.authKey = authKey;
    this.socketPath = socketPath;
  }
  
  getSocksProxyUrl(): string {
    return `socks5://localhost:${this.socksPort}`;
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

  async connect(authKey?: string): Promise<void> {
    const isInstalled = await this.checkTailscaleInstalled();
    if (!isInstalled) {
      throw new Error("Tailscale is not installed on this system. Please install Tailscale to use VPN connectivity.");
    }

    const keyToUse = (authKey || this.authKey)?.trim();
    if (!keyToUse) {
      throw new Error("Tailscale auth key is required. Please provide an auth key or set TAILSCALE_AUTH_KEY environment variable.");
    }

    console.log(`Attempting to connect with key starting with: ${keyToUse.substring(0, 10)}...`);
    console.log(`Key length: ${keyToUse.length}`);

    await this.ensureDaemonRunning();

    try {
      const escapedKey = keyToUse.replace(/'/g, "'\\''");
      const { stdout, stderr } = await execAsync(
        `tailscale --socket=${this.socketPath} up --authkey='${escapedKey}' --accept-routes --timeout=30s`
      );
      
      if (stderr && stderr.includes("error")) {
        throw new Error(stderr);
      }
      
      console.log("Successfully connected to Tailscale network");
      
      // Start SOCKS5 proxy for userspace networking
      try {
        await execAsync(`pkill -f 'tailscale.*socks5'`);
      } catch {
        // Ignore if no proxy running
      }
      
      execAsync(
        `nohup tailscale --socket=${this.socketPath} serve --bg socks5 localhost:${this.socksPort} > /tmp/tailscale/socks5.log 2>&1 &`
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`SOCKS5 proxy started on localhost:${this.socksPort}`);
    } catch (error: any) {
      console.error("Tailscale connection error:", error);
      
      if (error.message.includes("already logged in") || error.message.includes("already connected")) {
        console.log("Already logged in to Tailscale");
        return;
      }
      
      if (error.message.includes("invalid key") || error.message.includes("unable to validate API key")) {
        throw new Error("Invalid or expired Tailscale auth key. Please generate a new auth key at https://login.tailscale.com/admin/settings/keys");
      }
      
      if (error.message.includes("timeout waiting")) {
        throw new Error("Tailscale connection timeout. The service is starting but taking longer than expected. Please wait a moment and try again.");
      }
      
      throw new Error(`Failed to connect to Tailscale: ${error.message}`);
    }
  }

  async getDaemonStatus(): Promise<{ running: boolean; error?: string }> {
    const isInstalled = await this.checkTailscaleInstalled();
    if (!isInstalled) {
      return { 
        running: false, 
        error: "Tailscale is not installed" 
      };
    }

    const isResponsive = await this.isDaemonResponsive();
    return { running: isResponsive };
  }

  async startDaemon(): Promise<{ running: boolean; error?: string }> {
    const isInstalled = await this.checkTailscaleInstalled();
    if (!isInstalled) {
      return { 
        running: false, 
        error: "Tailscale is not installed" 
      };
    }

    try {
      await this.ensureDaemonRunning();
      return { running: true };
    } catch (error: any) {
      return { 
        running: false, 
        error: error.message 
      };
    }
  }

  async getStatus(): Promise<{ connected: boolean; daemonRunning: boolean; ip?: string; error?: string }> {
    const isInstalled = await this.checkTailscaleInstalled();
    if (!isInstalled) {
      return { 
        connected: false,
        daemonRunning: false,
        error: "Tailscale is not installed" 
      };
    }

    const daemonRunning = await this.isDaemonResponsive();
    
    if (!daemonRunning) {
      return {
        connected: false,
        daemonRunning: false,
      };
    }

    try {
      const { stdout } = await execAsync(`tailscale --socket=${this.socketPath} status --json`);
      const status = JSON.parse(stdout);
      
      const self = status.Self;
      if (self && self.Online) {
        return {
          connected: true,
          daemonRunning: true,
          ip: self.TailscaleIPs?.[0] || undefined,
        };
      }
      
      return { 
        connected: false,
        daemonRunning: true,
      };
    } catch (error: any) {
      console.error("Tailscale status check error:", error);
      return { 
        connected: false,
        daemonRunning: true,
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
