import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class TailscaleManager {
  private authKey: string;

  constructor(authKey: string) {
    this.authKey = authKey;
  }

  async connect(): Promise<void> {
    try {
      await execAsync(`tailscale up --authkey=${this.authKey} --accept-routes`);
    } catch (error: any) {
      throw new Error(`Failed to connect to Tailscale: ${error.message}`);
    }
  }

  async getStatus(): Promise<{ connected: boolean; ip?: string }> {
    try {
      const { stdout } = await execAsync("tailscale status --json");
      const status = JSON.parse(stdout);
      
      const self = status.Self;
      if (self && self.Online) {
        return {
          connected: true,
          ip: self.TailscaleIPs?.[0] || undefined,
        };
      }
      
      return { connected: false };
    } catch (error) {
      return { connected: false };
    }
  }

  async disconnect(): Promise<void> {
    try {
      await execAsync("tailscale down");
    } catch (error: any) {
      throw new Error(`Failed to disconnect from Tailscale: ${error.message}`);
    }
  }
}
