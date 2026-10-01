import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET } from "../packages/shared/src/index.ts";

const apply = process.argv.includes("--apply");
const baseUrl = "http://127.0.0.1:4310";
const started = Date.now();
const colors = { INFO: "36", STEP: "1;34", OK: "32", WARN: "33", ERROR: "1;31" };
const stats = { total: 0, success: 0, failed: 0, skipped: 0, retries: 0 };
const target = {
  scale: RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale,
  offset_x: RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x,
  offset_y: RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y,
};
const aspectRatios = ["16:9", "9:16"];

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

function matchesTarget(placement) {
  return placement && Object.entries(target).every(([key, value]) => placement[key] === value);
}

function nextChannelConfig(config) {
  const wide = config.placements?.["16:9"] ?? { position: config.position, flip_x: config.flip_x };
  return {
    ...config,
    ...target,
    placements: {
      ...config.placements,
      "16:9": { ...wide, ...target },
    },
  };
}

function nextRenderBundle(bundle) {
  return {
    ...bundle,
    config: {
      ...bundle.config,
      placements: Object.fromEntries(aspectRatios.map((aspect) => [aspect, { ...bundle.config.placements[aspect], ...target }])),
    },
  };
}

function stageMatches(settings) {
  return matchesTarget(settings.default_placement) && matchesTarget(settings.default_placements?.["16:9"]);
}

function channelMatches(channel) {
  return matchesTarget(channel.mascot_config) && matchesTarget(channel.mascot_config?.placements?.["16:9"]);
}

function profileMatches(profile) {
  return aspectRatios.every((aspect) => matchesTarget(profile.render_bundle?.config?.placements?.[aspect]));
}

async function saveBackup(config, channels, mascots) {
  const backup = path.resolve("scratch", `stage-placement-backup-${Date.now()}.json`);
  await mkdir(path.dirname(backup), { recursive: true });
  await writeFile(backup, JSON.stringify({ mascot_stage: config.mascot_stage, channels, mascots }, null, 2), { flag: "wx" });
  log("OK", "backup", backup);
  return backup;
}

async function synchronizeStage(settings) {
  if (stageMatches(settings)) {
    stats.skipped += 1;
    return;
  }
  const defaultPlacement = { ...settings.default_placement, ...target };
  const widePlacement = { ...(settings.default_placements?.["16:9"] ?? settings.default_placement), ...target };
  log("STEP", "stage", "Updating the global placement preset");
  const result = await request("/api/mascot-stage/settings", "POST", {
    default_placement: defaultPlacement,
    default_placements: { "16:9": widePlacement },
  });
  if (!stageMatches(result.mascot_stage)) throw new Error("Global placement verification failed");
  stats.success += 1;
}

async function synchronizeMascots(mascots) {
  for (const [index, profile] of mascots.entries()) {
    if (profileMatches(profile)) {
      stats.skipped += 1;
      continue;
    }
    const { mascot: current } = await request(`/api/mascots/${encodeURIComponent(profile.id)}`);
    if (profileMatches(current)) {
      stats.skipped += 1;
      continue;
    }
    if (!current.render_bundle) throw new Error(`Mascot ${profile.id} has no render bundle`);
    log("STEP", "profile", `${index + 1}/${mascots.length} ${profile.name}`, profile.id);
    const result = await request(`/api/mascots/${encodeURIComponent(profile.id)}`, "PUT", {
      render_bundle: nextRenderBundle(current.render_bundle),
    });
    if (!profileMatches(result.mascot)) throw new Error(`Mascot ${profile.id} placement verification failed`);
    stats.success += 1;
  }
}

async function synchronizeChannels(channels) {
  for (const [index, channel] of channels.entries()) {
    if (channelMatches(channel)) {
      stats.skipped += 1;
      continue;
    }
    log("STEP", "assign", `${index + 1}/${channels.length} ${channel.display_name}`, channel.channel_id);
    const result = await request(`/api/channels/${encodeURIComponent(channel.channel_id)}/mascot`, "PUT", {
      mascot_id: channel.mascot_id,
      config: nextChannelConfig(channel.mascot_config),
    });
    if (!channelMatches(result.channel)) throw new Error(`Channel ${channel.channel_id} placement verification failed`);
    stats.success += 1;
  }
}

async function verifyAll() {
  const [config, channelResponse, mascotResponse] = await Promise.all([
    request("/api/config"),
    request("/api/channels"),
    request("/api/mascots"),
  ]);
  const channels = channelResponse.channels.filter((channel) => channel.mascot_id);
  const invalidChannels = channels.filter((channel) => !channelMatches(channel));
  const invalidMascots = mascotResponse.mascots.filter((profile) => !profileMatches(profile));
  if (!stageMatches(config.mascot_stage) || invalidChannels.length || invalidMascots.length) {
    throw new Error(`Final verification failed: channels=${invalidChannels.length} mascots=${invalidMascots.length}`);
  }
  log("OK", "verify", `stage=1 channels=${channels.length} mascots=${mascotResponse.mascots.length}`);
}

async function synchronize() {
  const [config, channelResponse, mascotResponse] = await Promise.all([
    request("/api/config"),
    request("/api/channels"),
    request("/api/mascots"),
  ]);
  const channels = channelResponse.channels.filter((channel) => channel.mascot_id);
  const mascots = mascotResponse.mascots;
  stats.total = 1 + channels.length + mascots.length;
  log(
    "INFO",
    "startup",
    `mode=${apply ? "apply" : "dry-run"} channels=${channels.length} mascots=${mascots.length} concurrency=1 method=HTTP API config=${baseUrl} scale=${target.scale * 100}% x=${target.offset_x} y=${target.offset_y}`,
  );
  log(
    "INFO",
    "planned",
    `stage=${Number(!stageMatches(config.mascot_stage))} channels=${channels.filter((channel) => !channelMatches(channel)).length} mascots=${mascots.filter((profile) => !profileMatches(profile)).length}`,
  );
  if (!apply) return;
  const backup = await saveBackup(config, channels, mascots);
  try {
    await synchronizeStage(config.mascot_stage);
    await synchronizeMascots(mascots);
    await synchronizeChannels(channels);
    await verifyAll();
  } catch (error) {
    throw new Error(`${error.message}. Backup: ${backup}`, { cause: error });
  }
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
