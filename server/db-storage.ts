import { db } from "./db";
import { routers, scans, settings } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type {
  Router,
  InsertRouter,
  Scan,
  InsertScan,
  Settings,
  InsertSettings,
  TopologyData,
  AsymmetricRoute,
  OSPFNeighbor,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  async getRouter(id: string): Promise<Router | undefined> {
    const [router] = await db.select().from(routers).where(eq(routers.id, id));
    return router;
  }

  async getRouterByIp(ip: string): Promise<Router | undefined> {
    const [router] = await db.select().from(routers).where(eq(routers.ip, ip));
    return router;
  }

  async getAllRouters(): Promise<Router[]> {
    return await db.select().from(routers);
  }

  async createRouter(insertRouter: InsertRouter): Promise<Router> {
    const [router] = await db.insert(routers).values(insertRouter).returning();
    return router;
  }

  async updateRouter(id: string, updates: Partial<Router>): Promise<Router | undefined> {
    const [updated] = await db
      .update(routers)
      .set(updates)
      .where(eq(routers.id, id))
      .returning();
    return updated;
  }

  async deleteRouter(id: string): Promise<boolean> {
    const result = await db.delete(routers).where(eq(routers.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getScan(id: string): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(eq(scans.id, id));
    return scan;
  }

  async getAllScans(): Promise<Scan[]> {
    return await db.select().from(scans).orderBy(desc(scans.startedAt));
  }

  async getRecentScans(limit: number = 10): Promise<Scan[]> {
    return await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(limit);
  }

  async createScan(insertScan: InsertScan): Promise<Scan> {
    const [scan] = await db.insert(scans).values(insertScan).returning();
    return scan;
  }

  async updateScan(id: string, updates: Partial<Scan>): Promise<Scan | undefined> {
    const [updated] = await db
      .update(scans)
      .set(updates)
      .where(eq(scans.id, id))
      .returning();
    return updated;
  }

  async getSettings(): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).limit(1);
    return setting;
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<Settings> {
    const existing = await this.getSettings();
    
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set(updates)
        .where(eq(settings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(settings).values(updates).returning();
      return created;
    }
  }

  async getTopologyData(): Promise<TopologyData> {
    const allRouters = await this.getAllRouters();
    const nodes = allRouters.map((router) => ({
      id: router.id,
      ip: router.ip,
      hostname: router.hostname || undefined,
      identity: router.identity || undefined,
      status: router.status,
    }));

    const edges: TopologyData["edges"] = [];
    const edgeMap = new Map<string, { source: string; target: string; cost: number }>();

    allRouters.forEach((router) => {
      if (!router.ospfNeighbors) return;

      (router.ospfNeighbors as OSPFNeighbor[]).forEach((neighbor: OSPFNeighbor) => {
        const targetRouter = allRouters.find((r) => r.ip === neighbor.neighborIp);
        if (!targetRouter) return;

        const edgeKey = [router.id, targetRouter.id].sort().join("-");

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
    const allRouters = await this.getAllRouters();
    const asymmetricRoutes: AsymmetricRoute[] = [];
    const checkedPairs = new Set<string>();

    allRouters.forEach((router1) => {
      if (!router1.ospfNeighbors) return;

      (router1.ospfNeighbors as OSPFNeighbor[]).forEach((neighbor1: OSPFNeighbor) => {
        const router2 = allRouters.find((r) => r.ip === neighbor1.neighborIp);
        if (!router2 || !router2.ospfNeighbors) return;

        const pairKey = [router1.id, router2.id].sort().join("-");
        if (checkedPairs.has(pairKey)) return;
        checkedPairs.add(pairKey);

        const neighbor2 = (router2.ospfNeighbors as OSPFNeighbor[]).find(
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
