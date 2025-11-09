import { RouterOSAPI } from "node-routeros";
import type { OSPFNeighbor } from "@shared/schema";

export class MikrotikClient {
  private username: string;
  private password: string;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  async connect(host: string): Promise<RouterOSAPI> {
    const conn = new RouterOSAPI({
      host,
      user: this.username,
      password: this.password,
      timeout: 5,
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
      console.log(`✗ Connection failed: ${host}`);
      return false;
    } finally {
      if (conn) {
        conn.close();
      }
    }
  }
}
