import fs from "node:fs";
import path from "node:path";

/**
 * Parses .agent-orchestrator/zones.yml without external dependencies.
 * @param {string} yamlContent
 * @returns {Array<{ id: string, name: string, risk: string, lockPolicy: string, description: string, globs: string[], readStableDependencies: string[], verification: { commands: string[], notes: string } }>}
 */
export function parseZonesYaml(yamlContent) {
  const lines = yamlContent.split(/\r?\n/);
  const zones = [];
  let currentZone = null;
  let currentArrayKey = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Detect new zone entry: "- id: <id>"
    const zoneStartMatch = trimmed.match(/^-\s+id:\s*["']?([^"']+)["']?/);
    if (zoneStartMatch) {
      currentZone = {
        id: zoneStartMatch[1].trim(),
        name: "",
        risk: "medium",
        lockPolicy: "shared-disjoint",
        description: "",
        globs: [],
        readStableDependencies: [],
        verification: { commands: [], notes: "" },
      };
      zones.push(currentZone);
      currentArrayKey = null;
      continue;
    }

    if (!currentZone) continue;

    // Detect array element item: "- <value>"
    const arrayItemMatch = trimmed.match(/^-\s+["']?([^"']+)["']?$/);
    if (arrayItemMatch && currentArrayKey) {
      const val = arrayItemMatch[1].trim();
      if (currentArrayKey === "globs") {
        currentZone.globs.push(val);
      } else if (currentArrayKey === "readStableDependencies") {
        currentZone.readStableDependencies.push(val);
      } else if (currentArrayKey === "commands") {
        currentZone.verification.commands.push(val);
      }
      continue;
    }

    // Key-value pairs
    const kvMatch = trimmed.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let val = kvMatch[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }

      if (key === "globs" || key === "readStableDependencies" || key === "commands") {
        currentArrayKey = key;
        if (val === "[]") {
          currentArrayKey = null;
        }
      } else if (key === "verification") {
        currentArrayKey = null;
      } else if (key === "notes") {
        if (!currentZone.verification) currentZone.verification = { commands: [], notes: "" };
        currentZone.verification.notes = val;
        currentArrayKey = null;
      } else if (key in currentZone) {
        currentZone[key] = val;
        currentArrayKey = null;
      }
    }
  }

  return zones;
}

/**
 * Loads zone map from disk.
 * @param {string} workspaceRoot
 * @returns {Array<object>}
 */
export function loadZoneMap(workspaceRoot) {
  const zoneYamlPath = path.join(workspaceRoot, ".agent-orchestrator", "zones.yml");
  if (!fs.existsSync(zoneYamlPath)) {
    throw new Error(`Zone map not found at ${zoneYamlPath}`);
  }
  const content = fs.readFileSync(zoneYamlPath, "utf8");
  return parseZonesYaml(content);
}
