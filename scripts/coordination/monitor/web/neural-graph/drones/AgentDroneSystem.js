import { ZONE_POSITIONS } from "../../topology-layout.js";
import { createDroneModel } from "./DroneModelFactory.js";

/** Themed color palettes for agent cyber drones (one theme per claim). */
export const DRONE_PALETTES = [
  { name: "cyber-green", hex: 0x00ff88, labelBorder: "#00ff88", labelText: "#a7f3d0", labelBg: "rgba(5, 46, 22, 0.94)" },
  { name: "hyper-red", hex: 0xff0055, labelBorder: "#ff0055", labelText: "#fecdd3", labelBg: "rgba(59, 7, 24, 0.94)" },
  { name: "neon-purple", hex: 0xc026d3, labelBorder: "#c026d3", labelText: "#f5d0fe", labelBg: "rgba(59, 7, 100, 0.94)" },
  { name: "solar-gold", hex: 0xffd000, labelBorder: "#ffd000", labelText: "#fef08a", labelBg: "rgba(66, 32, 6, 0.94)" },
  { name: "electric-blue", hex: 0x0070f3, labelBorder: "#0070f3", labelText: "#bfdbfe", labelBg: "rgba(15, 23, 42, 0.94)" },
  { name: "plasma-cyan", hex: 0x00f7ff, labelBorder: "#00f7ff", labelText: "#a5f3fc", labelBg: "rgba(8, 47, 73, 0.94)" },
  { name: "blaze-orange", hex: 0xff6600, labelBorder: "#ff6600", labelText: "#fed7aa", labelBg: "rgba(67, 20, 7, 0.94)" },
  { name: "hot-pink", hex: 0xff007f, labelBorder: "#ff007f", labelText: "#fbcfe8", labelBg: "rgba(80, 7, 36, 0.94)" },
];

/**
 * Owns the 3D agent cyber drone fleet: reconciliation of active claims/zones
 * into drone targets (1 drone per claim, plus a drone per 2 duty waypoints),
 * unified per-claim color themes, drone lifecycle, and warp-out disposal.
 * Per-frame animation is delegated to DroneAnimator.
 */
export class AgentDroneSystem {
  constructor(scene, fileNeuronSystem, zoneNodeSystem) {
    this.scene = scene;
    this.fileNeuronSystem = fileNeuronSystem;
    this.zoneNodeSystem = zoneNodeSystem;
    this.agentDrones = new Map(); // droneKey -> drone record
    this.claimColorThemeMap = new Map(); // claimId -> drone theme
    this.claimColorThemeCounter = 0;
    this.droneColorCounter = 0;
  }

  /** Reconciles the drone fleet against the current claims and zone states. */
  update(claims = [], zones = []) {
    const activeTargets = [];
    const activeKeys = new Set();

    this.collectClaimTargets(claims, activeTargets, activeKeys);
    this.collectZoneTargets(zones, activeTargets, activeKeys);
    this.reconcileDrones(activeTargets, activeKeys);
  }

  // 1. Identify real active claims (1 drone per claim with multi-sphere waypoints)
  collectClaimTargets(claims, activeTargets, activeKeys) {
    if (!claims || claims.length === 0) return;

    for (const claim of claims) {
      if (claim.status && claim.status !== "active") continue;
      const writeZones = claim.writeZones && claim.writeZones.length > 0 ? claim.writeZones : ["shared-contracts"];
      const readZones = claim.readStableZones || [];

      // Build ordered list of duty waypoints: active write zones first, then read-stable dependencies
      const dutyWaypoints = this.buildDutyWaypoints(writeZones, readZones);

      // Color theme is unified per claim: all drones belonging to the same claim share the EXACT same color!
      const claimTheme = this.getOrCreateClaimTheme(claim.id);

      // Multi-drone squadron calculation: at least 1 drone, plus 1 drone for every 2 waypoints (e.g. 2 -> 1, 4 -> 2)
      const droneCount = Math.max(1, Math.floor(dutyWaypoints.length / 2));

      for (let dIndex = 0; dIndex < droneCount; dIndex++) {
        const droneKey = droneCount === 1 ? claim.id : `${claim.id}#${dIndex + 1}`;
        const agentLabel = droneCount === 1 ? claim.agent || "Agent" : `${claim.agent || "Agent"} [${dIndex + 1}/${droneCount}]`;
        const startingWpIndex = (dIndex * Math.floor(dutyWaypoints.length / droneCount)) % dutyWaypoints.length;

        if (!activeKeys.has(droneKey)) {
          activeKeys.add(droneKey);
          activeTargets.push({
            id: droneKey,
            claimId: claim.id,
            agentName: agentLabel,
            droneTheme: claimTheme,
            dutyWaypoints,
            initialWaypointIndex: startingWpIndex,
            plannedFiles: claim.plannedFiles || [],
          });
        }
      }
    }
  }

  // 2. Cross-reference zones with active writers or active status
  collectZoneTargets(zones, activeTargets, activeKeys) {
    if (!zones || zones.length === 0) return;

    for (const z of zones) {
      if (z.status !== "active") continue;

      if (z.writers && z.writers.length > 0) {
        for (const w of z.writers) {
          const droneKey = w.id;
          if (activeKeys.has(droneKey)) continue;
          activeKeys.add(droneKey);
          const claimTheme = this.getOrCreateClaimTheme(w.id);
          const wp = [
            {
              zoneId: z.id,
              pos: ZONE_POSITIONS[z.id] || { x: 0, y: 0, z: 0, radius: 4 },
              type: "active",
            },
          ];
          activeTargets.push({
            id: droneKey,
            claimId: w.id,
            agentName: w.agent || "Agent",
            droneTheme: claimTheme,
            dutyWaypoints: wp,
            initialWaypointIndex: 0,
            plannedFiles: w.plannedFiles || [],
          });
        }
      } else {
        // Zone has active status from claim, guarantee drone presence!
        const droneKey = `zone-active:${z.id}`;
        if (activeKeys.has(droneKey)) continue;
        activeKeys.add(droneKey);
        const claimTheme = this.getOrCreateClaimTheme(droneKey);
        const wp = [
          {
            zoneId: z.id,
            pos: ZONE_POSITIONS[z.id] || { x: 0, y: 0, z: 0, radius: 4 },
            type: "active",
          },
        ];
        activeTargets.push({
          id: droneKey,
          claimId: `claim-${z.id}`,
          agentName: "Agent",
          droneTheme: claimTheme,
          dutyWaypoints: wp,
          initialWaypointIndex: 0,
          plannedFiles: [],
        });
      }
    }
  }

  buildDutyWaypoints(writeZones, readZones) {
    const dutyWaypoints = [];
    const seenZones = new Set();

    for (const zoneId of writeZones) {
      if (!seenZones.has(zoneId) && ZONE_POSITIONS[zoneId]) {
        seenZones.add(zoneId);
        dutyWaypoints.push({
          zoneId,
          pos: ZONE_POSITIONS[zoneId],
          type: "active",
        });
      }
    }

    for (const zoneId of readZones) {
      if (!seenZones.has(zoneId) && ZONE_POSITIONS[zoneId]) {
        seenZones.add(zoneId);
        dutyWaypoints.push({
          zoneId,
          pos: ZONE_POSITIONS[zoneId],
          type: "read_stable",
        });
      }
    }

    if (dutyWaypoints.length === 0) {
      dutyWaypoints.push({
        zoneId: "shared-contracts",
        pos: ZONE_POSITIONS["shared-contracts"] || { x: 0, y: 0, z: 0, radius: 4 },
        type: "active",
      });
    }
    return dutyWaypoints;
  }

  getOrCreateClaimTheme(claimId) {
    if (!this.claimColorThemeMap.has(claimId)) {
      const themeIndex = this.claimColorThemeCounter++ % DRONE_PALETTES.length;
      this.claimColorThemeMap.set(claimId, DRONE_PALETTES[themeIndex]);
    }
    return this.claimColorThemeMap.get(claimId);
  }

  // 3. Update existing drones or create new ones for each active target
  reconcileDrones(activeTargets, activeKeys) {
    for (const target of activeTargets) {
      let drone = this.agentDrones.get(target.id);
      if (!drone) {
        drone = this.createDrone(target);
        this.agentDrones.set(target.id, drone);
      } else {
        this.refreshDrone(drone, target);
      }
    }

    // 5. Warp out any drones that are no longer in activeKeys
    for (const [key, drone] of this.agentDrones.entries()) {
      if (!activeKeys.has(key) && !drone.isWarpingOut) {
        drone.isWarpingOut = true;
        drone.warpStartTime = performance.now();
      }
    }
  }

  createDrone(info) {
    const droneTheme = info.droneTheme || DRONE_PALETTES[this.droneColorCounter++ % DRONE_PALETTES.length];
    return createDroneModel(this.scene, info, droneTheme);
  }

  refreshDrone(drone, target) {
    drone.plannedFiles = target.plannedFiles || [];
    if (target.dutyWaypoints && target.dutyWaypoints.length > 0) {
      drone.dutyWaypoints = target.dutyWaypoints;
      if (!drone.dutyWaypoints.some((wp) => wp.zoneId === drone.currentZoneId)) {
        drone.waypointIndex = 0;
        drone.currentWaypoint = drone.dutyWaypoints[0];
        drone.currentZoneId = drone.currentWaypoint.zoneId;
        drone.zonePos = drone.currentWaypoint.pos;
      }
    }
    if (drone.isWarpingOut) {
      drone.isWarpingOut = false;
    }
  }

  /** Removes and disposes every mesh/texture owned by a drone. */
  disposeDrone(drone) {
    if (!drone) return;
    this.scene.remove(drone.group);

    // Dispose all procedural meshes in the drone model
    if (drone.droneMeshes) {
      for (const m of drone.droneMeshes) {
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material.dispose();
          }
        }
      }
    }

    if (drone.tagSprite) {
      if (drone.tagSprite.material?.map) drone.tagSprite.material.map.dispose();
      drone.tagSprite.material?.dispose();
    }

    if (drone.legs) {
      for (const leg of drone.legs) {
        if (leg.bulletPool) {
          for (const bp of leg.bulletPool) {
            if (bp.bulletGroup) {
              this.scene.remove(bp.bulletGroup);
              if (bp.bulletOuterMesh?.geometry) bp.bulletOuterMesh.geometry.dispose();
              if (bp.bulletOuterMesh?.material) bp.bulletOuterMesh.material.dispose();
              if (bp.bulletCoreMesh?.geometry) bp.bulletCoreMesh.geometry.dispose();
              if (bp.bulletCoreMesh?.material) bp.bulletCoreMesh.material.dispose();
            }
            if (bp.impactFlare) {
              this.scene.remove(bp.impactFlare);
              if (bp.impactFlare.geometry) bp.impactFlare.geometry.dispose();
              if (bp.impactFlare.material) bp.impactFlare.material.dispose();
            }
          }
        }
      }
    }

    if (drone.megaBeamGroup) {
      this.scene.remove(drone.megaBeamGroup);
      drone.megaBeamGroup.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
    }

    if (drone.megaImpactFlare) {
      this.scene.remove(drone.megaImpactFlare);
      if (drone.megaImpactFlare.geometry) drone.megaImpactFlare.geometry.dispose();
      if (drone.megaImpactFlare.material) drone.megaImpactFlare.material.dispose();
    }
  }

  /** Recomputes orbit angle/radius from the drone's current world position. */
  syncDroneOrbitFromCurrentPos(drone) {
    if (!drone || !drone.zonePos) return;
    const dx = drone.group.position.x - drone.zonePos.x;
    const dz = drone.group.position.z - drone.zonePos.z;
    drone.wanderAngle = Math.atan2(dz, dx);
    const curR = Math.hypot(dx, dz);
    const minR = (drone.zonePos.radius || 4) * 2.2 + 5.0;
    drone.orbitRadius = Math.max(minR, curR);
  }
}
