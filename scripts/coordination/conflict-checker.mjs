/**
 * Checks for lock conflicts between candidate zones and active claims.
 *
 * @param {Array<object>} zoneList
 * @param {Array<object>} activeClaims
 * @param {{ writeZones: string[], readStableZones: string[], plannedFiles?: string[] }} candidate
 * @param {string} [excludeClaimId]
 * @returns {{ valid: boolean, conflicts: string[], resolvedReadStableZones: string[] }}
 */
export function validateAndCheckConflicts(zoneList, activeClaims, candidate, excludeClaimId) {
  const zoneMap = new Map(zoneList.map((z) => [z.id, z]));
  const conflicts = [];

  // Validate all requested zones exist
  for (const z of candidate.writeZones || []) {
    if (!zoneMap.has(z)) {
      conflicts.push(`Unknown write zone: "${z}"`);
    }
  }
  for (const z of candidate.readStableZones || []) {
    if (!zoneMap.has(z)) {
      conflicts.push(`Unknown read-stable zone: "${z}"`);
    }
  }
  if (conflicts.length > 0) {
    return { valid: false, conflicts, resolvedReadStableZones: candidate.readStableZones || [] };
  }

  // Resolve automatic read-stable dependencies
  const resolvedReadStable = new Set(candidate.readStableZones || []);
  for (const wz of candidate.writeZones || []) {
    const def = zoneMap.get(wz);
    if (def && Array.isArray(def.readStableDependencies)) {
      for (const dep of def.readStableDependencies) {
        if (!candidate.writeZones.includes(dep)) {
          resolvedReadStable.add(dep);
        }
      }
    }
  }

  const now = new Date().toISOString();
  const writeSet = new Set(candidate.writeZones || []);
  const readSet = resolvedReadStable;

  for (const active of activeClaims) {
    if (excludeClaimId && active.id === excludeClaimId) continue;
    // Skip expired claims
    if (active.expiresAt && active.expiresAt < now) continue;

    const activeWrites = new Set(active.writeZones || []);
    const activeReads = new Set(active.readStableZones || []);

    // 1. Exclusive write vs write conflict
    for (const z of writeSet) {
      if (activeWrites.has(z)) {
        const def = zoneMap.get(z);
        if (def && (def.lockPolicy === "exclusive" || def.lockPolicy === "runtime")) {
          conflicts.push(
            `Zone "${z}" is ${def.lockPolicy} and already claimed for write by active claim "${active.id}" (agent: ${active.agent}, task: "${active.task}").`,
          );
        } else if (def && def.lockPolicy === "shared-disjoint") {
          const activePlanned = active.plannedFiles || [];
          const candidatePlanned = candidate.plannedFiles || [];
          if (activePlanned.length === 0 || candidatePlanned.length === 0) {
            conflicts.push(`Claim "${active.id}" claims the whole shared-disjoint zone "${z}"; another writer cannot enter that zone.`);
            continue;
          }
          const overlap = findPlannedFileOverlap(activePlanned, candidatePlanned);
          if (overlap.length > 0) {
            conflicts.push(
              `Shared-disjoint zone "${z}" has overlapping planned files [${overlap.join(", ")}] with active claim "${active.id}".`,
            );
          }
        }
      }
    }

    // 2. Candidate write vs Active read-stable
    for (const z of writeSet) {
      if (activeReads.has(z)) {
        conflicts.push(
          `Zone "${z}" cannot be claimed for write because active claim "${active.id}" (agent: ${active.agent}) depends on it staying read-stable.`,
        );
      }
    }

    // 3. Candidate read-stable vs Active write
    for (const z of readSet) {
      if (activeWrites.has(z)) {
        conflicts.push(
          `Zone "${z}" cannot be claimed as read-stable because active claim "${active.id}" (agent: ${active.agent}) is actively modifying it.`,
        );
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
    resolvedReadStableZones: Array.from(resolvedReadStable),
  };
}
import { findPlannedFileOverlap } from "./path-ownership.mjs";
