import CIDR from "ip-cidr";
import { MikrotikClient } from "./mikrotik";
import type { Router, OSPFNeighbor, IStorage } from "@shared/schema";

export interface ScanProgress {
  progress: number;
  status: "scanning" | "completed" | "error";
  routersFound: number;
  currentIp?: string;
  error?: string;
}

export class NetworkScanner {
  private mikrotikClient: MikrotikClient;
  private storage: any;

  constructor(username: string, password: string, storage: any) {
    this.mikrotikClient = new MikrotikClient(username, password);
    this.storage = storage;
  }

  async scanSubnet(
    subnet: string,
    onProgress?: (progress: ScanProgress) => void
  ): Promise<{ routers: Router[]; count: number }> {
    try {
      const cidr = new CIDR(subnet);
      const ips = cidr.toArray();
      const totalIps = ips.length;
      
      // Prevent scanning huge subnets
      if (totalIps > 1024) {
        throw new Error(`Subnet too large: ${totalIps} IPs. Please use a subnet with /22 or smaller (max 1024 IPs). For 10.0.0.0/8 networks, scan specific subnets like 10.0.1.0/24 instead.`);
      }
      
      console.log(`Scanning subnet ${subnet} with ${totalIps} IPs`);
      const routers: Router[] = [];
      
      for (let i = 0; i < ips.length; i++) {
        const ip = ips[i];
        const progress = Math.floor(((i + 1) / totalIps) * 100);
        
        if (onProgress) {
          onProgress({
            progress,
            status: "scanning",
            routersFound: routers.length,
            currentIp: ip,
          });
        }

        const isOnline = await this.mikrotikClient.testConnection(ip);
        
        if (isOnline) {
          const systemInfo = await this.mikrotikClient.getSystemInfo(ip);
          const ospfNeighbors = await this.mikrotikClient.getOSPFNeighbors(ip);
          
          const existingRouter = await this.storage.getRouterByIp(ip);
          
          if (existingRouter) {
            const updated = await this.storage.updateRouter(existingRouter.id, {
              status: "online",
              identity: systemInfo.identity,
              version: systemInfo.version,
              model: systemInfo.model,
              ospfNeighbors,
              lastSeen: new Date(),
            });
            if (updated) routers.push(updated);
          } else {
            const router = await this.storage.createRouter({
              ip,
              hostname: systemInfo.identity,
              identity: systemInfo.identity,
              version: systemInfo.version,
              model: systemInfo.model,
              status: "online",
              ospfNeighbors,
            });
            routers.push(router);
          }
        }
      }

      if (onProgress) {
        onProgress({
          progress: 100,
          status: "completed",
          routersFound: routers.length,
        });
      }

      return { routers, count: routers.length };
    } catch (error: any) {
      if (onProgress) {
        onProgress({
          progress: 0,
          status: "error",
          routersFound: 0,
          error: error.message,
        });
      }
      throw error;
    }
  }
}
