import { RouterOSAPI } from "node-routeros";
import type { OSPFNeighbor } from "@shared/schema";
import type { SSHTunnelManager } from "./ssh-tunnel";
import net from "net";

export class SSHTunnelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SSHTunnelError";
  }
}

export class MikrotikClient {
  private username: string;
  private password: string;
  private sshTunnel: SSHTunnelManager | null;

  constructor(username: string, password: string, sshTunnel?: SSHTunnelManager) {
    this.username = username;
    this.password = password;
    this.sshTunnel = sshTunnel || null;
  }

  async connect(host: string): Promise<RouterOSAPI> {
    let socket: net.Socket | undefined;

    // If SSH tunnel is available, use it to connect
    if (this.sshTunnel && this.sshTunnel.getStatus().connected) {
      try {
        socket = await this.sshTunnel.forwardConnection(host, 8728);
        console.log(`Using SSH tunnel to connect to ${host}`);
      } catch (error: any) {
        console.error(`SSH tunnel forward failed for ${host}:`, error.message);
        throw new SSHTunnelError(`SSH tunnel forward failed to ${host}: ${error.message}`);
      }
    }

    const conn = new RouterOSAPI({
      host: socket ? "localhost" : host,
      user: this.username,
      password: this.password,
      timeout: 5,
      ...(socket && { socket }), // Use the SSH-tunneled socket if available
    });

    await conn.connect();
    return conn;
  }

  async getSystemInfo(host: string): Promise<{
    identity?: string;
    version?: string;
    model?: string;
  }> {
    let conn: RouterOSAPI | null = null;
    try {
      conn = await this.connect(host);
      
      const [identity] = await conn.write("/system/identity/print");
      const [resource] = await conn.write("/system/resource/print");
      
      return {
        identity: identity?.name || undefined,
        version: resource?.version || undefined,
        model: resource?.["board-name"] || undefined,
      };
    } catch (error) {
      // SSH tunnel errors are fatal - rethrow them
      if (error instanceof SSHTunnelError) {
        throw error;
      }
      console.error(`Failed to get system info from ${host}:`, error);
      return {};
    } finally {
      if (conn) {
        conn.close();
      }
    }
  }

  async getOSPFNeighbors(host: string): Promise<OSPFNeighbor[]> {
    let conn: RouterOSAPI | null = null;
    try {
      conn = await this.connect(host);
      
      const neighbors = await conn.write("/routing/ospf/neighbor/print");
      
      return neighbors.map((neighbor: any) => ({
        neighborId: neighbor["router-id"] || "",
        neighborIp: neighbor.address || "",
        cost: parseInt(neighbor.cost || "0", 10),
        state: neighbor.state || "unknown",
        priority: parseInt(neighbor.priority || "0", 10),
        deadTime: neighbor["dead-time"] || "",
        address: neighbor.address || "",
        interface: neighbor.interface || "",
      }));
    } catch (error) {
      // SSH tunnel errors are fatal - rethrow them
      if (error instanceof SSHTunnelError) {
        throw error;
      }
      console.error(`Failed to get OSPF neighbors from ${host}:`, error);
      return [];
    } finally {
      if (conn) {
        conn.close();
      }
    }
  }

  async testConnection(host: string): Promise<boolean> {
    let conn: RouterOSAPI | null = null;
    try {
      conn = await this.connect(host);
      await conn.write("/system/identity/print");
      console.log(`✓ Connection successful: ${host}`);
      return true;
    } catch (error) {
      // SSH tunnel errors are fatal - rethrow them
      if (error instanceof SSHTunnelError) {
        throw error;
      }
      // Regular connection errors just mean router is offline
      console.log(`✗ Connection failed: ${host}`);
      return false;
    } finally {
      if (conn) {
        conn.close();
      }
    }
  }
}
