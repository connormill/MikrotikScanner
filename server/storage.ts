import {
  type Router,
  type InsertRouter,
  type Scan,
  type InsertScan,
  type Settings,
  type InsertSettings,
  type OSPFNeighbor,
  type TopologyData,
  type AsymmetricRoute,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getRouter(id: string): Promise<Router | undefined>;
  getRouterByIp(ip: string): Promise<Router | undefined>;
  getAllRouters(): Promise<Router[]>;
  createRouter(router: InsertRouter): Promise<Router>;
  updateRouter(id: string, router: Partial<Router>): Promise<Router | undefined>;
  deleteRouter(id: string): Promise<boolean>;

  getScan(id: string): Promise<Scan | undefined>;
  getAllScans(): Promise<Scan[]>;
  getRecentScans(limit?: number): Promise<Scan[]>;
  createScan(scan: InsertScan): Promise<Scan>;
  updateScan(id: string, scan: Partial<Scan>): Promise<Scan | undefined>;

  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;

  getTopologyData(): Promise<TopologyData>;
  getAsymmetricRoutes(): Promise<AsymmetricRoute[]>;
}

export class MemStorage implements IStorage {
  private routers: Map<string, Router>;
  private scans: Map<string, Scan>;
  private settings: Settings | undefined;

  constructor() {
    this.routers = new Map();
    this.scans = new Map();
    this.settings = undefined;
  }

  async getRouter(id: string): Promise<Router | undefined> {
    return this.routers.get(id);
  }

  async getRouterByIp(ip: string): Promise<Router | undefined> {
    return Array.from(this.routers.values()).find((router) => router.ip === ip);
  }

  async getAllRouters(): Promise<Router[]> {
    return Array.from(this.routers.values());
  }

  async createRouter(insertRouter: InsertRouter): Promise<Router> {
    const id = randomUUID();
    const router: Router = {
      ...insertRouter,
      id,
      lastSeen: new Date(),
      status: insertRouter.status || "unknown",
      ospfNeighbors: insertRouter.ospfNeighbors || [],
    };
    this.routers.set(id, router);
    return router;
  }

  async updateRouter(id: string, updates: Partial<Router>): Promise<Router | undefined> {
    const router = this.routers.get(id);
    if (!router) return undefined;

    const updatedRouter = { ...router, ...updates };
    this.routers.set(id, updatedRouter);
    return updatedRouter;
  }

  async deleteRouter(id: string): Promise<boolean> {
    return this.routers.delete(id);
  }

  async getScan(id: string): Promise<Scan | undefined> {
    return this.scans.get(id);
  }

  async getAllScans(): Promise<Scan[]> {
    return Array.from(this.scans.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  async getRecentScans(limit: number = 10): Promise<Scan[]> {
    const allScans = await this.getAllScans();
    return allScans.slice(0, limit);
  }

  async createScan(insertScan: InsertScan): Promise<Scan> {
    const id = randomUUID();
    const scan: Scan = {
      ...insertScan,
      id,
      startedAt: new Date(),
      completedAt: null,
      routersFound: 0,
      asymmetriesFound: 0,
      results: null,
    };
    this.scans.set(id, scan);
    return scan;
  }

  async updateScan(id: string, updates: Partial<Scan>): Promise<Scan | undefined> {
    const scan = this.scans.get(id);
    if (!scan) return undefined;

    const updatedScan = { ...scan, ...updates };
    this.scans.set(id, updatedScan);
    return updatedScan;
  }

  async getSettings(): Promise<Settings | undefined> {
    return this.settings;
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<Settings> {
    if (!this.settings) {
      this.settings = {
        id: randomUUID(),
        tailscaleStatus: "disconnected",
        mikrotikUsername: null,
        mikrotikPassword: null,
        defaultSubnets: [],
        ...updates,
      };
    } else {
      this.settings = { ...this.settings, ...updates };
    }
    return this.settings;
  }

  async getTopologyData(): Promise<TopologyData> {
    const routers = Array.from(this.routers.values());
    const nodes = routers.map((router) => ({
      id: router.id,
      ip: router.ip,
      hostname: router.hostname,
      identity: router.identity,
      status: router.status,
    }));

    const edges: TopologyData["edges"] = [];
    const edgeMap = new Map<string, { source: string; target: string; cost: number }>();

    routers.forEach((router) => {
      if (!router.ospfNeighbors) return;

      router.ospfNeighbors.forEach((neighbor: OSPFNeighbor) => {
        const targetRouter = Array.from(this.routers.values()).find(
          (r) => r.ip === neighbor.neighborIp
        );
        if (!targetRouter) return;

        const edgeKey = [router.id, targetRouter.id].sort().join("-");
        const reverseEdgeKey = [targetRouter.id, router.id].sort().join("-");

        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            source: router.id,
            target: targetRouter.id,
            cost: neighbor.cost,
          });
        }

        const existingEdge = edgeMap.get(edgeKey);
        if (existingEdge) {
          const isAsymmetric = existingEdge.cost !== neighbor.cost;
          edges.push({
            id: `${router.id}-${targetRouter.id}`,
            source: router.id,
            target: targetRouter.id,
            cost: neighbor.cost,
            isAsymmetric,
            reverseCost: existingEdge.cost,
          });
        }
      });
    });

    return { nodes, edges };
  }

  async getAsymmetricRoutes(): Promise<AsymmetricRoute[]> {
    const routers = Array.from(this.routers.values());
    const asymmetricRoutes: AsymmetricRoute[] = [];
    const checkedPairs = new Set<string>();

    routers.forEach((router1) => {
      if (!router1.ospfNeighbors) return;

      router1.ospfNeighbors.forEach((neighbor1: OSPFNeighbor) => {
        const router2 = Array.from(this.routers.values()).find(
          (r) => r.ip === neighbor1.neighborIp
        );
        if (!router2 || !router2.ospfNeighbors) return;

        const pairKey = [router1.id, router2.id].sort().join("-");
        if (checkedPairs.has(pairKey)) return;
        checkedPairs.add(pairKey);

        const neighbor2 = router2.ospfNeighbors.find(
          (n: OSPFNeighbor) => n.neighborIp === router1.ip
        );
        if (!neighbor2) return;

        if (neighbor1.cost !== neighbor2.cost) {
          const difference = Math.abs(neighbor1.cost - neighbor2.cost);
          const severity: "low" | "medium" | "high" =
            difference > 50 ? "high" : difference > 20 ? "medium" : "low";

          asymmetricRoutes.push({
            router1: router1.identity || router1.hostname || router1.ip,
            router2: router2.identity || router2.hostname || router2.ip,
            router1Ip: router1.ip,
            router2Ip: router2.ip,
            cost1to2: neighbor1.cost,
            cost2to1: neighbor2.cost,
            difference,
            severity,
          });
        }
      });
    });

    return asymmetricRoutes;
  }
}

export const storage = new MemStorage();
