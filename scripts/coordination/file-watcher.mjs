import fs from "node:fs";
import path from "node:path";
import { loadZoneMap } from "./zone-loader.mjs";
import { globToRegExp, normalizePath } from "./glob-matcher.mjs";
import { findWorkspaceRoot } from "./workspace-root.mjs";

const DEFAULT_IGNORED_PREFIXES = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".turbo/",
  ".next/",
  "tmp/",
  "coverage/",
  ".agent-orchestrator/",
  ".gemini/",
  ".vscode/",
  ".idea/",
  "coordination.db",
];

const DEFAULT_IGNORED_EXTENSIONS = [
  ".tmp",
  ".temp",
  ".swp",
  ".swo",
  "~",
  ".log",
];

export class FastZoneMatcher {
  constructor(zones) {
    this.zones = zones || [];
    this.compiledZones = this.zones.map((zone) => {
      const positive = [];
      const negative = [];
      for (const g of zone.globs || []) {
        const parsed = globToRegExp(g);
        if (parsed.isNegative) {
          negative.push(parsed.regex);
        } else {
          positive.push(parsed.regex);
        }
      }
      return {
        id: zone.id,
        name: zone.name,
        risk: zone.risk,
        lockPolicy: zone.lockPolicy,
        readStableDependencies: zone.readStableDependencies || [],
        positive,
        negative,
      };
    });
  }

  static fromWorkspace(rootDir) {
    const zones = loadZoneMap(rootDir);
    return new FastZoneMatcher(zones);
  }

  match(filePath) {
    const norm = normalizePath(filePath);

    for (const zone of this.compiledZones) {
      let isExcluded = false;
      for (const neg of zone.negative) {
        if (neg.test(norm)) {
          isExcluded = true;
          break;
        }
      }
      if (isExcluded) continue;

      for (const pos of zone.positive) {
        if (pos.test(norm)) {
          return {
            zoneId: zone.id,
            zoneName: zone.name,
            risk: zone.risk,
            lockPolicy: zone.lockPolicy,
            dependentZones: zone.readStableDependencies,
          };
        }
      }
    }

    return null;
  }
}

export function isIgnoredPath(filePath, customIgnored = []) {
  const norm = normalizePath(filePath);
  if (!norm) return true;

  // Ignore databases and root logs
  if (norm.startsWith("coordination.db") || norm.endsWith(".log")) {
    return true;
  }

  const allIgnoredPrefixes = [...DEFAULT_IGNORED_PREFIXES, ...customIgnored];
  for (const prefix of allIgnoredPrefixes) {
    if (norm.startsWith(prefix) || norm.includes("/" + prefix)) {
      return true;
    }
  }

  for (const ext of DEFAULT_IGNORED_EXTENSIONS) {
    if (norm.endsWith(ext)) {
      return true;
    }
  }

  const baseName = path.basename(norm);
  if (baseName.startsWith(".") && baseName !== ".env.example" && baseName !== ".gitignore") {
    return true;
  }

  return false;
}

export class CodebaseFileWatcher {
  constructor(options = {}) {
    this.rootDir = options.rootDir || findWorkspaceRoot();
    this.debounceMs = options.debounceMs ?? 50;
    this.onActivity = options.onActivity || (() => {});
    this.matcher = options.matcher || FastZoneMatcher.fromWorkspace(this.rootDir);
    this.watchers = [];
    this.pendingEvents = new Map();
    this.debounceTimer = null;
    this.isWatching = false;
    this.stats = {
      rawEventsReceived: 0,
      ignoredEvents: 0,
      matchedEvents: 0,
      unmatchedEvents: 0,
      batchesDispatched: 0,
      startedAt: null,
    };
  }

  start() {
    if (this.isWatching) return;
    this.isWatching = true;
    this.stats.startedAt = Date.now();

    const watchDirs = ["apps", "packages", "services", "scripts", "docs"];
    let rootWatched = false;

    // Try selective directory watch first for efficiency
    for (const dir of watchDirs) {
      const fullPath = path.join(this.rootDir, dir);
      if (fs.existsSync(fullPath)) {
        try {
          const watcher = fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
            if (!filename) return;
            const relPath = path.join(dir, filename.toString());
            this.handleRawFileEvent(eventType, relPath);
          });
          watcher.on("error", (err) => console.error(`Watcher error on ${dir}:`, err));
          this.watchers.push(watcher);
        } catch {
          // If recursive sub-watch fails, fallback to root watch
        }
      }
    }

    // If no subdirs watched or fallback needed, watch root
    if (this.watchers.length === 0) {
      try {
        const watcher = fs.watch(this.rootDir, { recursive: true }, (eventType, filename) => {
          if (!filename) return;
          this.handleRawFileEvent(eventType, filename.toString());
        });
        watcher.on("error", (err) => console.error("Watcher error on root:", err));
        this.watchers.push(watcher);
        rootWatched = true;
      } catch (err) {
        console.error("Failed to start root file watcher:", err);
      }
    }
  }

  stop() {
    if (!this.isWatching) return;
    this.isWatching = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch {}
    }
    this.watchers = [];
    this.pendingEvents.clear();
  }

  handleRawFileEvent(eventType, rawPath) {
    this.stats.rawEventsReceived++;
    const norm = normalizePath(rawPath);

    if (isIgnoredPath(norm)) {
      this.stats.ignoredEvents++;
      return;
    }

    const fullPath = path.join(this.rootDir, norm);
    let semanticType = eventType === "rename" ? "change" : "change";

    // Determine add/change/unlink if file exists
    try {
      if (fs.existsSync(fullPath)) {
        semanticType = "change";
      } else {
        semanticType = "unlink";
      }
    } catch {
      semanticType = "change";
    }

    this.pendingEvents.set(norm, {
      file: norm,
      eventType: semanticType,
      timestamp: Date.now(),
    });

    if (!this.debounceTimer) {
      this.debounceTimer = setTimeout(() => this.flush(), this.debounceMs);
    }
  }

  flush() {
    this.debounceTimer = null;
    if (this.pendingEvents.size === 0) return;

    const eventsToProcess = Array.from(this.pendingEvents.values());
    this.pendingEvents.clear();

    const activities = [];

    for (const item of eventsToProcess) {
      const matchResult = this.matcher.match(item.file);
      if (matchResult) {
        this.stats.matchedEvents++;
        activities.push({
          file: item.file,
          fileName: path.basename(item.file),
          eventType: item.eventType,
          zoneId: matchResult.zoneId,
          zoneName: matchResult.zoneName,
          risk: matchResult.risk,
          lockPolicy: matchResult.lockPolicy,
          dependentZones: matchResult.dependentZones,
          timestamp: item.timestamp,
        });
      } else {
        this.stats.unmatchedEvents++;
      }
    }

    if (activities.length > 0) {
      this.stats.batchesDispatched++;
      this.onActivity(activities);
    }
  }

  getStats() {
    return {
      ...this.stats,
      activeWatchers: this.watchers.length,
      isWatching: this.isWatching,
      pendingEventsCount: this.pendingEvents.size,
    };
  }
}
