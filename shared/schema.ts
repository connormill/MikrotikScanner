import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const routers = pgTable("routers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ip: text("ip").notNull(),
  hostname: text("hostname"),
  identity: text("identity"),
  version: text("version"),
  model: text("model"),
  status: text("status").notNull().default("unknown"),
  lastSeen: timestamp("last_seen").defaultNow(),
  ospfNeighbors: jsonb("ospf_neighbors").$type<OSPFNeighbor[]>().default([]),
});

export const scans = pgTable("scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subnet: text("subnet").notNull(),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  routersFound: integer("routers_found").default(0),
  asymmetriesFound: integer("asymmetries_found").default(0),
  results: jsonb("results").$type<ScanResults>(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tailscaleStatus: text("tailscale_status").default("disconnected"),
  mikrotikUsername: text("mikrotik_username"),
  mikrotikPassword: text("mikrotik_password"),
  defaultSubnets: jsonb("default_subnets").$type<string[]>().default([]),
});

export type OSPFNeighbor = {
  neighborId: string;
  neighborIp: string;
  cost: number;
  state: string;
  priority: number;
  deadTime: string;
  address: string;
  interface: string;
};

export type AsymmetricRoute = {
  router1: string;
  router2: string;
  router1Ip: string;
  router2Ip: string;
  cost1to2: number;
  cost2to1: number;
  difference: number;
  severity: "low" | "medium" | "high";
};

export type ScanResults = {
  routers: string[];
  asymmetricRoutes: AsymmetricRoute[];
  topologyData: TopologyData;
};

export type TopologyData = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
};

export type TopologyNode = {
  id: string;
  ip: string;
  hostname?: string;
  identity?: string;
  status: string;
};

export type TopologyEdge = {
  id: string;
  source: string;
  target: string;
  cost: number;
  isAsymmetric: boolean;
  reverseCost?: number;
};

export const insertRouterSchema = createInsertSchema(routers).omit({
  id: true,
  lastSeen: true,
});

export const insertScanSchema = createInsertSchema(scans).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  routersFound: true,
  asymmetriesFound: true,
  results: true,
}).extend({
  subnet: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, "Invalid CIDR notation"),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export type InsertRouter = z.infer<typeof insertRouterSchema>;
export type Router = typeof routers.$inferSelect;

export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

export type User = {
  id: string;
  username: string;
  password: string;
};

export type InsertUser = Omit<User, "id">;
