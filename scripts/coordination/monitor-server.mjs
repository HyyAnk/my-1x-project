import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { openClaimsDb, getActiveClaims } from "./db.mjs";
import { loadZoneMap } from "./zone-loader.mjs";
import { findWorkspaceRoot } from "./workspace-root.mjs";
import { validateAndCheckConflicts } from "./conflict-checker.mjs";
import { isClaimDead } from "./heartbeat-service.mjs";

/**
 * Transforms the raw zone list into graph topology nodes and links.
 * @param {Array<object>} zoneList
 * @returns {{ zones: Array<object>, links: Array<{ source: string, target: string, type: string }> }}
 */
export function buildTopologyPayload(zoneList) {
  const links = [];
  const zones = zoneList.map((z) => {
    const dependencies = Array.isArray(z.readStableDependencies) ? [...z.readStableDependencies] : [];
    for (const dep of dependencies) {
      links.push({
        source: z.id,
        target: dep,
        type: "read-dependency",
      });
    }
    return {
      id: z.id,
      name: z.name || z.id,
      risk: z.risk || "medium",
      lockPolicy: z.lockPolicy || "exclusive",
      description: z.description || "",
      globs: z.globs || [],
      dependencies,
    };
  });

  return { zones, links };
}

/**
 * Builds the consolidated real-time state of zones, active claims, and agents.
 * @param {{ workspaceRoot?: string, customDbPath?: string, zoneList?: Array<object> }} [options]
 * @returns {object}
 */
export function buildCoordinationState({ workspaceRoot, customDbPath, zoneList } = {}) {
  const root = workspaceRoot || findWorkspaceRoot();
  const zones = zoneList || loadZoneMap(root);
  const now = new Date();
  const nowIso = now.toISOString();

  let activeClaims = [];
  try {
    const db = openClaimsDb(root, customDbPath);
    try {
      activeClaims = getActiveClaims(db);
    } finally {
      db.close();
    }
  } catch (err) {
    activeClaims = [];
  }

  // Map active claims with dead/heartbeat detection
  const claimsWithLiveness = activeClaims.map((claim) => {
    const deadCheck = isClaimDead(claim, now);
    const { leaseTokenHash: _secret, ...safeClaim } = claim;
    return {
      ...safeClaim,
      isDead: deadCheck.isDead,
      deadReason: deadCheck.reason || null,
      elapsedMinutes: deadCheck.elapsedMinutes || 0,
    };
  });

  const activeWritesByZone = new Map();
  const activeReadsByZone = new Map();

  for (const claim of claimsWithLiveness) {
    for (const wz of claim.writeZones || []) {
      if (!activeWritesByZone.has(wz)) activeWritesByZone.set(wz, []);
      activeWritesByZone.get(wz).push(claim);
    }
    for (const rz of claim.readStableZones || []) {
      if (!activeReadsByZone.has(rz)) activeReadsByZone.set(rz, []);
      activeReadsByZone.get(rz).push(claim);
    }
  }

  const zoneStates = zones.map((z) => {
    const writers = activeWritesByZone.get(z.id) || [];
    const readers = activeReadsByZone.get(z.id) || [];

    let status = "idle";
    if (writers.length > 0) {
      status = "active";
    } else if (readers.length > 0) {
      status = "read_stable";
    }

    const hasStaleHeartbeat = writers.some((c) => c.isDead) || readers.some((c) => c.isDead);

    return {
      id: z.id,
      name: z.name || z.id,
      risk: z.risk,
      lockPolicy: z.lockPolicy,
      description: z.description,
      dependencies: z.readStableDependencies || [],
      status,
      hasStaleHeartbeat,
      writers: writers.map((c) => ({
        id: c.id,
        agent: c.agent,
        task: c.task,
        expiresAt: c.expiresAt,
        plannedFiles: c.plannedFiles || [],
        isDead: c.isDead,
      })),
      readers: readers.map((c) => ({
        id: c.id,
        agent: c.agent,
        task: c.task,
        expiresAt: c.expiresAt,
      })),
    };
  });

  const activeAgents = [...new Set(claimsWithLiveness.map((c) => c.agent))];

  return {
    timestamp: nowIso,
    summary: {
      totalZones: zones.length,
      idleZones: zoneStates.filter((z) => z.status === "idle").length,
      activeZones: zoneStates.filter((z) => z.status === "active").length,
      readStableZones: zoneStates.filter((z) => z.status === "read_stable").length,
      totalActiveClaims: claimsWithLiveness.length,
      activeAgents,
    },
    zones: zoneStates,
    claims: claimsWithLiveness,
  };
}

/**
 * Calculates which zones are safe/disjoint to claim without conflict.
 * @param {{ targetZone: string, workspaceRoot?: string, customDbPath?: string }} options
 * @returns {{ targetZone: string, safeZones: string[], conflictingZones: Array<{ zone: string, reason: string }> }}
 */
export function calculateSafeZones({ targetZone, workspaceRoot, customDbPath }) {
  const root = workspaceRoot || findWorkspaceRoot();
  const zoneList = loadZoneMap(root);
  const zoneMap = new Map(zoneList.map((z) => [z.id, z]));

  if (!zoneMap.has(targetZone)) {
    throw new Error(`Unknown target zone: "${targetZone}"`);
  }

  let activeClaims = [];
  try {
    const db = openClaimsDb(root, customDbPath);
    try {
      activeClaims = getActiveClaims(db);
    } finally {
      db.close();
    }
  } catch (err) {
    activeClaims = [];
  }

  const safeZones = [];
  const conflictingZones = [];

  for (const candidate of zoneList) {
    if (candidate.id === targetZone) continue;
    const check = validateAndCheckConflicts(zoneList, activeClaims, {
      writeZones: [candidate.id],
      readStableZones: [],
    });
    if (check.valid) {
      safeZones.push(candidate.id);
    } else {
      conflictingZones.push({
        zone: candidate.id,
        reason: check.conflicts[0] || "Conflict with active claims",
      });
    }
  }

  return { targetZone, safeZones, conflictingZones };
}

/**
 * Creates the HTTP monitor server with REST and SSE endpoints.
 * @param {object} [options]
 * @returns {http.Server}
 */
export function createMonitorServer(options = {}) {
  const root = options.workspaceRoot || findWorkspaceRoot();
  const customDbPath = options.customDbPath;
  const pollIntervalMs = options.pollIntervalMs || 1000;
  const zoneList = loadZoneMap(root);
  const topology = buildTopologyPayload(zoneList);

  const sseClients = new Set();
  let lastSerializedState = "";
  let pollTimer = null;

  function broadcast(event, data) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(message);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  }

  function tick() {
    try {
      const state = buildCoordinationState({ workspaceRoot: root, customDbPath, zoneList });
      const serialized = JSON.stringify(state);
      if (serialized !== lastSerializedState) {
        lastSerializedState = serialized;
        broadcast("state", state);
      }
    } catch (err) {
      // Keep running despite transient DB read lock
    }
  }

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = parsedUrl.pathname;

    // CORS Headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    if (pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() }));
      return;
    }

    if (pathname === "/api/topology") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(topology));
      return;
    }

    if (pathname === "/api/state") {
      const state = buildCoordinationState({ workspaceRoot: root, customDbPath, zoneList });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(state));
      return;
    }

    if (pathname === "/api/safe-zones") {
      const zone = parsedUrl.searchParams.get("zone");
      if (!zone) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing 'zone' query parameter" }));
        return;
      }
      try {
        const result = calculateSafeZones({ targetZone: zone, workspaceRoot: root, customDbPath });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (pathname === "/api/stream") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      res.write(": connected\n\n");

      // Send immediate initial state
      const initialState = buildCoordinationState({ workspaceRoot: root, customDbPath, zoneList });
      res.write(`event: state\ndata: ${JSON.stringify(initialState)}\n\n`);

      sseClients.add(res);

      req.on("close", () => {
        sseClients.delete(res);
      });
      return;
    }

    // Static files serving from scripts/coordination/monitor/web/
    const webDir = path.resolve(root, "scripts", "coordination", "monitor", "web");
    const relPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(webDir, relPath);

    if (filePath.startsWith(webDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const mimeTypes = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ico": "image/x-icon",
      };
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  // Start polling timer
  pollTimer = setInterval(tick, pollIntervalMs);

  server.on("close", () => {
    if (pollTimer) clearInterval(pollTimer);
    for (const client of sseClients) {
      try {
        client.end();
      } catch (_) {}
    }
    sseClients.clear();
  });

  return server;
}

// CLI Execution support
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { values } = parseArgs({
    options: {
      port: { type: "string", short: "p", default: "3344" },
      host: { type: "string", short: "h", default: "127.0.0.1" },
      open: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
  });

  if (values.help) {
    process.stdout.write(`
Usage: node scripts/coordination/monitor-server.mjs [options]

Options:
  -p, --port <port>   Port to listen on (default: 3344)
  -h, --host <host>   Host to bind to (default: 127.0.0.1)
  -o, --open          Automatically open browser upon server start
  --help              Show this help message
`);
    process.exit(0);
  }

  const port = parseInt(values.port, 10) || 3344;
  const host = values.host;
  const server = createMonitorServer();

  server.listen(port, host, () => {
    process.stdout.write(`⚡ Agent Coordination Monitor running at http://${host}:${port}/\n`);
    process.stdout.write(`   - API State: http://${host}:${port}/api/state\n`);
    process.stdout.write(`   - SSE Stream: http://${host}:${port}/api/stream\n`);
    process.stdout.write(`   - Topology: http://${host}:${port}/api/topology\n`);

    if (values.open) {
      import("node:child_process").then(({ exec }) => {
        const url = `http://${host}:${port}/`;
        const openCmd = process.platform === "win32" ? `start ${url}` : process.platform === "darwin" ? `open ${url}` : `xdg-open ${url}`;
        exec(openCmd, () => {});
      });
    }
  });

  process.on("SIGINT", () => {
    server.close(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });
}
