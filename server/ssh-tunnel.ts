import { Client, ClientChannel } from "ssh2";
import net from "net";

export class SSHTunnelManager {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private host: string = "";

  constructor() {}

  async connect(host: string, username: string, password: string): Promise<void> {
    this.host = host;
    
    if (this.isConnected && this.client) {
      console.log("SSH tunnel already connected");
      return;
    }

    return new Promise((resolve, reject) => {
      this.client = new Client();

      this.client.on("ready", () => {
        console.log(`✓ SSH tunnel connected to ${host}`);
        this.isConnected = true;
        resolve();
      });

      this.client.on("error", (err: Error) => {
        console.error("✗ SSH tunnel error:", err.message);
        this.isConnected = false;
        reject(err);
      });

      this.client.on("close", () => {
        console.log("SSH tunnel closed");
        this.isConnected = false;
      });

      console.log(`Connecting SSH tunnel to ${host}...`);
      this.client.connect({
        host,
        port: 22,
        username,
        password,
        readyTimeout: 10000,
      });
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
    }
  }

  getStatus(): { connected: boolean; host: string } {
    return {
      connected: this.isConnected,
      host: this.host,
    };
  }

  /**
   * Forward a connection to a remote host through the SSH tunnel
   * Returns a promise that resolves with a net.Socket connected through the tunnel
   */
  async forwardConnection(remoteHost: string, remotePort: number): Promise<net.Socket> {
    if (!this.client || !this.isConnected) {
      throw new Error("SSH tunnel not connected");
    }

    return new Promise((resolve, reject) => {
      this.client!.forwardOut(
        "127.0.0.1", // Source address (doesn't matter for outbound)
        0,           // Source port (0 = any)
        remoteHost,  // Destination host
        remotePort,  // Destination port
        (err: Error | undefined, stream: ClientChannel) => {
          if (err) {
            reject(new Error(`SSH forward failed to ${remoteHost}:${remotePort}: ${err.message}`));
            return;
          }

          // Convert the SSH stream to a regular net.Socket-like object
          const socket = stream as unknown as net.Socket;
          resolve(socket);
        }
      );
    });
  }
}
