import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { DatabaseStorage } from "./db-storage";
import { MikrotikClient } from "./mikrotik";
import { TailscaleManager } from "./tailscale";
import { NetworkScanner, type ScanProgress } from "./scanner";
import { insertScanSchema } from "@shared/schema";
import { z } from "zod";
import { initializeDemoData } from "./demo-data";

const storage = new DatabaseStorage();
const scanProgressClients = new Map<string, Response[]>();

export async function registerRoutes(app: Express): Promise<Server> {
  const tailscaleAuthKey = process.env.TAILSCALE_AUTH_KEY || "";
  const defaultUsername = process.env.MIKROTIK_USERNAME || "admin";
  const defaultPassword = process.env.MIKROTIK_PASSWORD || "";

  const tailscale = new TailscaleManager(tailscaleAuthKey);

  await storage.updateSettings({
    mikrotikUsername: defaultUsername,
    mikrotikPassword: defaultPassword,
  });

  if (process.env.NODE_ENV === "development") {
    const routers = await storage.getAllRouters();
    if (routers.length === 0) {
      await initializeDemoData(storage);
    }
  }

  app.get("/api/routers", async (req: Request, res: Response) => {
    try {
      const routers = await storage.getAllRouters();
      res.json(routers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/routers/:id", async (req: Request, res: Response) => {
    try {
      const router = await storage.getRouter(req.params.id);
      if (!router) {
        return res.status(404).json({ error: "Router not found" });
      }
      res.json(router);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/routers/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updated = await storage.updateRouter(id, updates);
      
      if (!updated) {
        return res.status(404).json({ error: "Router not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/routers/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteRouter(id);
      
      if (!success) {
        return res.status(404).json({ error: "Router not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/routers/:id/rescan", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const router = await storage.getRouter(id);
      
      if (!router) {
        return res.status(404).json({ error: "Router not found" });
      }

      const settings = await storage.getSettings();
      const username = settings?.mikrotikUsername || defaultUsername;
      const password = settings?.mikrotikPassword || defaultPassword;
      
      const mikrotikClient = new MikrotikClient(username, password);
      
      try {
        const isOnline = await mikrotikClient.testConnection(router.ip);
        
        if (isOnline) {
          const systemInfo = await mikrotikClient.getSystemInfo(router.ip);
          const ospfNeighbors = await mikrotikClient.getOSPFNeighbors(router.ip);
          
          const updated = await storage.updateRouter(id, {
            status: "online",
            identity: systemInfo.identity,
            version: systemInfo.version,
            model: systemInfo.model,
            ospfNeighbors,
            lastSeen: new Date(),
          });
          
          res.json(updated);
        } else {
          const updated = await storage.updateRouter(id, {
            status: "offline",
            lastSeen: new Date(),
          });
          
          res.json(updated);
        }
      } catch (error: any) {
        const updated = await storage.updateRouter(id, {
          status: "offline",
          lastSeen: new Date(),
        });
        
        res.json(updated);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/scans", async (req: Request, res: Response) => {
    try {
      const scans = await storage.getAllScans();
      res.json(scans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/scans/recent", async (req: Request, res: Response) => {
    try {
      const scans = await storage.getRecentScans(10);
      res.json(scans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/scans/:id", async (req: Request, res: Response) => {
    try {
      const scan = await storage.getScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }
      res.json(scan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/scans", async (req: Request, res: Response) => {
    try {
      const validatedData = insertScanSchema.parse(req.body);
      const scan = await storage.createScan(validatedData);

      res.json(scan);

      const settings = await storage.getSettings();
      const username = settings?.mikrotikUsername || defaultUsername;
      const password = settings?.mikrotikPassword || defaultPassword;
      const scanner = new NetworkScanner(username, password, storage);

      (async () => {
        try {
          await storage.updateScan(scan.id, { status: "scanning" });

          const result = await scanner.scanSubnet(scan.subnet, (progress: ScanProgress) => {
            const clients = scanProgressClients.get(scan.id) || [];
            clients.forEach((client) => {
              client.write(`data: ${JSON.stringify(progress)}\n\n`);
            });
          });

          const asymmetricRoutes = await storage.getAsymmetricRoutes();
          const topologyData = await storage.getTopologyData();

          await storage.updateScan(scan.id, {
            status: "completed",
            completedAt: new Date(),
            routersFound: result.count,
            asymmetriesFound: asymmetricRoutes.length,
            results: {
              routers: result.routers.map((r) => r.id),
              asymmetricRoutes,
              topologyData,
            },
          });

          const clients = scanProgressClients.get(scan.id) || [];
          clients.forEach((client) => {
            client.write(
              `data: ${JSON.stringify({
                progress: 100,
                status: "completed",
                routersFound: result.count,
                asymmetriesFound: asymmetricRoutes.length,
              })}\n\n`
            );
            client.end();
          });
          scanProgressClients.delete(scan.id);
        } catch (error: any) {
          await storage.updateScan(scan.id, {
            status: "error",
            completedAt: new Date(),
          });

          const clients = scanProgressClients.get(scan.id) || [];
          clients.forEach((client) => {
            client.write(
              `data: ${JSON.stringify({
                progress: 0,
                status: "error",
                routersFound: 0,
                error: error.message,
              })}\n\n`
            );
            client.end();
          });
          scanProgressClients.delete(scan.id);
        }
      })();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/scans/:id/progress", (req: Request, res: Response) => {
    const scanId = req.params.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (!scanProgressClients.has(scanId)) {
      scanProgressClients.set(scanId, []);
    }
    scanProgressClients.get(scanId)!.push(res);

    req.on("close", () => {
      const clients = scanProgressClients.get(scanId);
      if (clients) {
        const index = clients.indexOf(res);
        if (index > -1) {
          clients.splice(index, 1);
        }
        if (clients.length === 0) {
          scanProgressClients.delete(scanId);
        }
      }
    });
  });

  app.get("/api/topology", async (req: Request, res: Response) => {
    try {
      const topology = await storage.getTopologyData();
      res.json(topology);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/topology/asymmetric", async (req: Request, res: Response) => {
    try {
      const asymmetricRoutes = await storage.getAsymmetricRoutes();
      res.json(asymmetricRoutes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {
        id: "default",
        tailscaleStatus: "disconnected",
        mikrotikUsername: defaultUsername,
        mikrotikPassword: null,
        defaultSubnets: [],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings/credentials", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const settings = await storage.updateSettings({
        mikrotikUsername: username,
        mikrotikPassword: password,
      });

      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tailscale/status", async (req: Request, res: Response) => {
    try {
      const status = await tailscale.getStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tailscale/connect", async (req: Request, res: Response) => {
    try {
      await tailscale.connect();
      const status = await tailscale.getStatus();
      
      await storage.updateSettings({
        tailscaleStatus: status.connected ? "connected" : "disconnected",
      });

      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
