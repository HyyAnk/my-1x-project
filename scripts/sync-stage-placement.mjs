import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET } from "../packages/shared/src/index.ts";

const apply = process.argv.includes("--apply");
const baseUrl = "http://127.0.0.1:4310";
const started = Date.now();
const colors = { INFO: "36", STEP: "1;34", OK: "32", WARN: "33", ERROR: "1;31" };
const stats = { total: 0, success: 0, failed: 0, skipped: 0, retries: 0 };

function log(level, step, message, channel = "all") {
  const line = `${new Date().toISOString()} [${level}] [T:worker-1] [P:${channel}] [STEP:${step}] ${message}`;
  process.stdout.write(process.stdout.isTTY ? `\u001b[${colors[level]}m${line}\u001b[0m\n` : `${line}\n`);
}

async function request(route, method = "GET", body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${method} ${route}: HTTP ${response.status}`);
  return response.json();
}

function nextConfig(config) {
  const oldPlacement = config.placements?.["16:9"] ?? config;
  const placement = {
    position: oldPlacement.position,
    flip_x: oldPlacement.flip_x ?? false,
    scale: RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale,
    offset_x: RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x,
    offset_y: RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y,
  };
  return { ...config, ...placement, placements: { "16:9": placement } };
}

async function synchronize() {
  const [config, response] = await Promise.all([request("/api/config"), request("/api/channels")]);
  const channels = response.channels.filter((channel) => channel.mascot_id);
  stats.total = channels.length;
  log(
    "INFO",
    "startup",
    `mode=${apply ? "apply" : "dry-run"} profiles=${channels.length} concurrency=1 method=HTTP API config=${baseUrl} scale=366% x=115 y=180`,
  );
  if (!apply) return;
  const backup = path.resolve("scratch", `stage-placement-backup-${Date.now()}.json`);
  await mkdir(path.dirname(backup), { recursive: true });
  await writeFile(backup, JSON.stringify({ mascot_stage: config.mascot_stage, channels }, null, 2), { flag: "wx" });
  log("OK", "backup", backup);
  const placement = { ...RECOMMENDED_MASCOT_PLACEMENT_PRESET };
  await request("/api/mascot-stage/settings", "POST", { default_placement: placement, default_placements: { "16:9": placement } });
  for (const [index, channel] of channels.entries()) {
    const updated = nextConfig(channel.mascot_config);
    if (
      ["scale", "offset_x", "offset_y"].every(
        (key) => channel.mascot_config[key] === updated[key] && channel.mascot_config.placements?.["16:9"]?.[key] === updated[key],
      )
    ) {
      stats.skipped += 1;
      continue;
    }
    try {
      log("STEP", "assign", `${index + 1}/${channels.length}`, channel.display_name);
      const result = await request(`/api/channels/${channel.channel_id}/mascot`, "PUT", { mascot_id: channel.mascot_id, config: updated });
      const confirmed = result.channel.mascot_config;
      if (confirmed.scale !== 3.66 || confirmed.offset_x !== 115 || confirmed.offset_y !== 180)
        throw new Error("Assignment verification failed");
      stats.success += 1;
    } catch (error) {
      stats.failed += 1;
      log("ERROR", "assign", `${error.message}. Retry after resolving the API error; backup=${backup}`, channel.display_name);
    }
  }
  if (stats.failed) process.exitCode = 1;
}

try {
  await synchronize();
} catch (error) {
  stats.failed += 1;
  process.exitCode = 1;
  log("ERROR", "sync", `${error.message}. Verify the local server and retry.`);
} finally {
  log(stats.failed ? "ERROR" : "OK", "summary", `${JSON.stringify(stats)} elapsedMs=${Date.now() - started}`);
}
