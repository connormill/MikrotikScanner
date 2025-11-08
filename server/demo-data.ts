import { storage } from "./storage";

export async function initializeDemoData() {
  const demoRouters = [
    {
      ip: "192.168.1.1",
      hostname: "router-core-01",
      identity: "Core Router 1",
      version: "7.11.2",
      model: "CCR2004-16G-2S+",
      status: "online",
      ospfNeighbors: [
        {
          neighborId: "192.168.1.2",
          neighborIp: "192.168.1.2",
          cost: 10,
          state: "Full",
          priority: 1,
          deadTime: "00:00:39",
          address: "192.168.1.2",
          interface: "ether1",
        },
        {
          neighborId: "192.168.1.3",
          neighborIp: "192.168.1.3",
          cost: 10,
          state: "Full",
          priority: 1,
          deadTime: "00:00:38",
          address: "192.168.1.3",
          interface: "ether2",
        },
      ],
    },
    {
      ip: "192.168.1.2",
      hostname: "router-edge-01",
      identity: "Edge Router 1",
      version: "7.11.2",
      model: "RB5009UG+S+",
      status: "online",
      ospfNeighbors: [
        {
          neighborId: "192.168.1.1",
          neighborIp: "192.168.1.1",
          cost: 10,
          state: "Full",
          priority: 1,
          deadTime: "00:00:37",
          address: "192.168.1.1",
          interface: "ether1",
        },
        {
          neighborId: "192.168.1.4",
          neighborIp: "192.168.1.4",
          cost: 25,
          state: "Full",
          priority: 1,
          deadTime: "00:00:36",
          address: "192.168.1.4",
          interface: "ether3",
        },
      ],
    },
    {
      ip: "192.168.1.3",
      hostname: "router-edge-02",
      identity: "Edge Router 2",
      version: "7.11.2",
      model: "RB5009UG+S+",
      status: "online",
      ospfNeighbors: [
        {
          neighborId: "192.168.1.1",
          neighborIp: "192.168.1.1",
          cost: 10,
          state: "Full",
          priority: 1,
          deadTime: "00:00:35",
          address: "192.168.1.1",
          interface: "ether1",
        },
        {
          neighborId: "192.168.1.4",
          neighborIp: "192.168.1.4",
          cost: 15,
          state: "Full",
          priority: 1,
          deadTime: "00:00:34",
          address: "192.168.1.4",
          interface: "ether2",
        },
      ],
    },
    {
      ip: "192.168.1.4",
      hostname: "router-dist-01",
      identity: "Distribution Router 1",
      version: "7.11.2",
      model: "CCR1036-12G-4S",
      status: "online",
      ospfNeighbors: [
        {
          neighborId: "192.168.1.2",
          neighborIp: "192.168.1.2",
          cost: 20,
          state: "Full",
          priority: 1,
          deadTime: "00:00:33",
          address: "192.168.1.2",
          interface: "ether1",
        },
        {
          neighborId: "192.168.1.3",
          neighborIp: "192.168.1.3",
          cost: 15,
          state: "Full",
          priority: 1,
          deadTime: "00:00:32",
          address: "192.168.1.3",
          interface: "ether2",
        },
      ],
    },
  ];

  for (const router of demoRouters) {
    await storage.createRouter(router);
  }

  const demoScan = await storage.createScan({
    subnet: "192.168.1.0/24",
    status: "completed",
  });

  await storage.updateScan(demoScan.id, {
    status: "completed",
    completedAt: new Date(),
    routersFound: 4,
    asymmetriesFound: 1,
  });

  console.log("Demo data initialized successfully");
}
