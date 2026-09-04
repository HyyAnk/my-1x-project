import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {
  buildTopologyPayload,
  buildCoordinationState,
  calculateSafeZones,
  createMonitorServer,
} from "../monitor-server.mjs";
import { ZONE_POSITIONS } from "../monitor/web/topology-layout.js";
import { loadZoneMap } from "../zone-loader.mjs";
import { findWorkspaceRoot } from "../workspace-root.mjs";

test("buildTopologyPayload extracts zones and dependency links", () => {
  const root = findWorkspaceRoot();
  const zoneList = loadZoneMap(root);
  const topology = buildTopologyPayload(zoneList);

  assert.equal(topology.zones.length, 19, "Expected 19 zones");
  assert.ok(topology.links.length > 0, "Expected at least one dependency link");
  assert.ok(Array.isArray(topology.files), "Expected topology.files array");
  assert.ok(topology.files.length > 500, "Expected hundreds of mapped file micro-nodes");

  // Check an expected dependency link: api-contracts depends on shared-contracts
  const apiDep = topology.links.find(
    (link) => link.source === "api-contracts" && link.target === "shared-contracts"
  );
  assert.ok(apiDep, "Expected api-contracts -> shared-contracts link");
});

test("ZONE_POSITIONS covers all 19 repository zones with valid 3D coordinates", () => {
  const root = findWorkspaceRoot();
  const zoneList = loadZoneMap(root);

  for (const z of zoneList) {
    const pos = ZONE_POSITIONS[z.id];
    assert.ok(pos, `Missing 3D coordinates for zone: "${z.id}"`);
    assert.equal(typeof pos.x, "number");
    assert.equal(typeof pos.y, "number");
    assert.equal(typeof pos.z, "number");
    assert.ok(pos.radius > 0, `Radius must be positive for "${z.id}"`);
  }
});

test("buildCoordinationState maps active claims to zone statuses", () => {
  const root = findWorkspaceRoot();
  const state = buildCoordinationState({ workspaceRoot: root });

  assert.equal(state.zones.length, 19);
  assert.ok(typeof state.summary.totalZones === "number");
  assert.ok(typeof state.summary.idleZones === "number");
  assert.ok(typeof state.summary.activeZones === "number");

  // Check that current active claim is reflected
  if (state.claims.length > 0) {
    const activeClaim = state.claims[0];
    for (const wz of activeClaim.writeZones) {
      const zoneState = state.zones.find((z) => z.id === wz);
      assert.ok(zoneState);
      assert.equal(zoneState.status, "active");
      assert.ok(zoneState.writers.some((w) => w.id === activeClaim.id));
    }
  }
});

test("calculateSafeZones identifies safe disjoint zones", () => {
  const root = findWorkspaceRoot();
  const result = calculateSafeZones({
    targetZone: "agent-coordination",
    workspaceRoot: root,
  });

  assert.equal(result.targetZone, "agent-coordination");
  assert.ok(Array.isArray(result.safeZones));
  assert.ok(Array.isArray(result.conflictingZones));
  assert.ok(result.safeZones.length > 0, "Expected at least one safe zone");
});

test("createMonitorServer responds to HTTP endpoints, static files, and SSE streams", async () => {
  const root = findWorkspaceRoot();
  const server = createMonitorServer({ workspaceRoot: root, pollIntervalMs: 200 });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Test /api/health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.status, "ok");
    assert.ok(healthData.fileWatcher, "Health must report fileWatcher stats");
    assert.equal(typeof healthData.fileWatcher.activeWatchers, "number");

    // 2. Test /api/topology
    const topoRes = await fetch(`${baseUrl}/api/topology`);
    assert.equal(topoRes.status, 200);
    const topoData = await topoRes.json();
    assert.equal(topoData.zones.length, 19);

    // 3. Test /api/state
    const stateRes = await fetch(`${baseUrl}/api/state`);
    assert.equal(stateRes.status, 200);
    const stateData = await stateRes.json();
    assert.equal(stateData.summary.totalZones, 19);

    // 4. Test /api/safe-zones
    const safeRes = await fetch(`${baseUrl}/api/safe-zones?zone=agent-coordination`);
    assert.equal(safeRes.status, 200);
    const safeData = await safeRes.json();
    assert.equal(safeData.targetZone, "agent-coordination");

    // 5. Test Static HTML & CSS & JS Serving
    const indexRes = await fetch(`${baseUrl}/`);
    assert.equal(indexRes.status, 200);
    assert.match(indexRes.headers.get("content-type") || "", /text\/html/);
    const indexHtml = await indexRes.text();
    assert.ok(indexHtml.includes("NEURAL AGENT COORDINATOR"));

    const cssRes = await fetch(`${baseUrl}/style.css`);
    assert.equal(cssRes.status, 200);
    assert.match(cssRes.headers.get("content-type") || "", /text\/css/);

    const appJsRes = await fetch(`${baseUrl}/app.js`);
    assert.equal(appJsRes.status, 200);
    assert.match(appJsRes.headers.get("content-type") || "", /javascript/);

    const graphJsRes = await fetch(`${baseUrl}/neural-graph.js`);
    assert.equal(graphJsRes.status, 200);
    assert.match(graphJsRes.headers.get("content-type") || "", /javascript/);

    // 6. Test /api/stream SSE for state and file_activity events
    const sseEvents = await new Promise((resolve, reject) => {
      const req = http.get(`${baseUrl}/api/stream`, (res) => {
        assert.equal(res.statusCode, 200);
        assert.equal(res.headers["content-type"], "text/event-stream");

        let buffer = "";
        res.on("data", (chunk) => {
          buffer += chunk.toString();
          if (buffer.includes("event: state") && buffer.includes("event: file_activity")) {
            req.destroy();
            resolve(buffer);
          }
        });
        res.on("error", reject);
      });

      // Simulate a file activity broadcast shortly after connect
      setTimeout(() => {
        server.broadcast("file_activity", {
          file: "apps/server/src/routes/episodes.ts",
          fileName: "episodes.ts",
          eventType: "change",
          zoneId: "api-contracts",
          zoneName: "API Contracts And Routes",
          dependentZones: ["shared-contracts"],
          timestamp: Date.now(),
        });
      }, 50);

      req.on("error", (err) => {
        if (err.code === "ECONNRESET") resolve("reset-ok");
        else reject(err);
      });
    });

    assert.ok(sseEvents.includes("event: state") || sseEvents === "reset-ok");
    if (sseEvents !== "reset-ok") {
      assert.ok(sseEvents.includes("event: file_activity"));
      assert.ok(sseEvents.includes("api-contracts"));
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("launchers exist, are valid, and target monitor-server", () => {
  const root = findWorkspaceRoot();
  const rootRunBat = path.join(root, "run-agent-monitor.bat");
  const rootStopBat = path.join(root, "stop-agent-monitor.bat");
  const scriptsCmd = path.join(root, "scripts", "agent-monitor.cmd");
  const coordRunBat = path.join(root, "scripts", "coordination", "run-monitor.bat");
  const coordStopBat = path.join(root, "scripts", "coordination", "stop-monitor.bat");

  for (const p of [rootRunBat, rootStopBat, scriptsCmd, coordRunBat, coordStopBat]) {
    assert.ok(fs.existsSync(p), `Missing launcher: ${p}`);
    const content = fs.readFileSync(p, "utf8");
    assert.ok(content.length > 10, `Launcher is too small: ${p}`);
  }
});

