import * as THREE from "three";
import { ZONE_POSITIONS } from "../../topology-layout.js";
import { buildDroneBody } from "./DroneBodyFactory.js";
import { buildLeg, getLegConfigs } from "./DroneLegFactory.js";
import { createAgentLabelSprite } from "../shared/canvasSprite.js";

/**
 * Assembles the complete procedural 6-legged hexapod orb sentinel drone:
 * droneGroup -> modelGroup -> coreGroup (body) + 6 articulated legs,
 * themed point light, and the floating agent-name hologram tag.
 * Returns the fully-populated mutable drone record used by the animator.
 */
export function createDroneModel(scene, info, droneTheme) {
  const droneGroup = new THREE.Group();
  const dutyWaypoints =
    info.dutyWaypoints && info.dutyWaypoints.length > 0
      ? info.dutyWaypoints
      : [
          {
            zoneId: info.targetZoneId || "agent-coordination",
            pos: ZONE_POSITIONS[info.targetZoneId || "agent-coordination"] || { x: 0, y: 0, z: 0, radius: 4 },
            type: "active",
          },
        ];
  const initialIndex =
    info.initialWaypointIndex !== undefined && info.initialWaypointIndex < dutyWaypoints.length ? info.initialWaypointIndex : 0;
  const initialWaypoint = dutyWaypoints[initialIndex];
  const zonePos = initialWaypoint.pos;
  const targetZoneId = initialWaypoint.zoneId;
  const agentName = info.agentName || info.agent || "Agent";
  const claimId = info.claimId || info.id || `claim-${targetZoneId}`;
  const droneKey = info.id || `${claimId}:${targetZoneId}`;

  const initAngle = Math.random() * Math.PI * 2;
  const initRadius = (zonePos.radius || 4) * 2.2 + 5.5 + Math.random() * 2.5;
  droneGroup.position.set(
    zonePos.x + Math.cos(initAngle) * initRadius,
    zonePos.y + 7.5 + (Math.random() - 0.5) * 4.0,
    zonePos.z + Math.sin(initAngle) * initRadius,
  );
  droneGroup.scale.set(0.01, 0.01, 0.01);

  // Subgroup containing all articulating drone body meshes.
  // Pitch/roll/yaw rotations are applied here so tagSprite stays upright and facing camera.
  const modelGroup = new THREE.Group();
  // Balanced sentinel scale: prominent, compact, clean visual hierarchy
  modelGroup.scale.set(1.4, 1.4, 1.4);
  droneGroup.add(modelGroup);

  const coreGroup = new THREE.Group();
  modelGroup.add(coreGroup);

  const body = buildDroneBody(modelGroup, coreGroup, droneTheme);
  const eye = body.eye;
  const antiGravGlow = body.antiGravGlow;
  const chargingOrb = body.chargingOrb;
  const megaBeam = body.megaBeam;

  // 6 Articulated Mechanical Legs (3 Left, 3 Right) - Perfect bilateral symmetry
  const legConfigs = getLegConfigs();
  const legs = [];
  const legMats = {
    whiteHullMat: body.mats.whiteHullMat,
    darkMetalMat: body.mats.darkMetalMat,
    blueAccentMat: body.mats.blueAccentMat,
    laserMuzzleMat: body.mats.laserMuzzleMat,
    droneMeshes: body.droneMeshes,
    accentTrimMeshes: body.accentTrimMeshes,
  };
  for (let i = 0; i < legConfigs.length; i++) {
    legs.push(buildLeg(legConfigs[i], modelGroup, scene, legMats));
  }

  scene.add(megaBeam.megaBeamGroup);
  scene.add(megaBeam.megaImpactFlare);

  // Drone PointLight: Themed Sentinel Glow
  const droneLight = new THREE.PointLight(droneTheme.hex, 2.6, 45);
  droneLight.position.set(0, 0.4, 0.6);
  droneGroup.add(droneLight);

  // Drone Agent Hologram Tag
  const tagSprite = createAgentLabelSprite(agentName, droneTheme);
  tagSprite.position.set(0, 2.8, 0);
  tagSprite.scale.set(3.8, 0.95, 1);
  droneGroup.add(tagSprite);

  scene.add(droneGroup);

  const planned = info.plannedFiles || [];
  return {
    claimId,
    droneKey,
    agentName,
    dutyWaypoints,
    currentWaypoint: initialWaypoint,
    currentZoneId: targetZoneId,
    zonePos,
    group: droneGroup,
    modelGroup,
    coreGroup,
    eyeGroup: eye.eyeGroup,
    pupilMesh: eye.pupilMesh,
    legs,
    droneMeshes: body.droneMeshes,
    accentTrimMeshes: body.accentTrimMeshes,
    antiGravGlow,
    droneLight,
    tagSprite,
    chargingOrbGroup: chargingOrb.chargingOrbGroup,
    orbCoreMesh: chargingOrb.orbCoreMesh,
    orbShellMesh: chargingOrb.orbShellMesh,
    accretionRing1: chargingOrb.accretionRing1,
    accretionRing2: chargingOrb.accretionRing2,
    megaBeamGroup: megaBeam.megaBeamGroup,
    megaOuterMat: megaBeam.megaOuterMat,
    megaCoreMat: megaBeam.megaCoreMat,
    megaImpactFlare: megaBeam.megaImpactFlare,
    droneTheme,
    chargeDuration: 2000,
    blastDuration: 450,
    plannedFiles: planned,
    plannedFileIndex: 0,
    scale: 0.01,
    targetScale: 1.4,
    isWarpingOut: false,
    warpStartTime: 0,

    // Organic 3D Free-Patrol Kinematics (Independent random kinematics per drone)
    wanderAngle: initAngle,
    baseWanderSpeed: 0.007 + Math.random() * 0.006,
    orbitDirection: Math.random() > 0.5 ? 1 : -1,
    orbitRadius: initRadius,
    seedR: Math.random() * Math.PI * 2,
    seedY: Math.random() * Math.PI * 2,
    seedPhase: Math.random() * 100,

    // Patrol cycle counters (reduced to 2 full patrol + laser cycles per sphere before transit)
    patrolCyclesAtSphere: Math.floor(Math.random() * 2), // Staggered cycle start so drones don't transit at the exact same moment
    maxPatrolCyclesAtSphere: 2,

    // 5-Phase State Machine: 0: PATROL, 1: LASER_SALVO, 2: TRANSIT, 3: EYE_CHARGE (2s), 4: MEGA_BLAST (450ms)
    droneState: 0,
    stateStartTime: performance.now() - Math.random() * 1500, // Staggered elapsed time for organic desynchronization
    patrolDuration: 1800 + Math.random() * 1400,
    laserDuration: 2400,
    hoverPos: new THREE.Vector3(
      zonePos.x + Math.cos(initAngle) * initRadius,
      zonePos.y + 7.5 + (Math.random() - 0.5) * 4.0,
      zonePos.z + Math.sin(initAngle) * initRadius,
    ),

    // Inter-sphere transit kinematics (50% speed = ~4800-9000ms duration)
    transitStartTime: 0,
    transitDuration: 5500,
    transitStartPos: new THREE.Vector3(),
    transitTargetPos: new THREE.Vector3(),
    nextWaypoint: null,
    waypointIndex: initialIndex,

    // Target Coordinates (Strictly scoped within current zone)
    targetPos: new THREE.Vector3(zonePos.x, zonePos.y, zonePos.z),
    targetZoneId: targetZoneId,
    isTargetingFile: false,
    targetTimer: 0,
  };
}
