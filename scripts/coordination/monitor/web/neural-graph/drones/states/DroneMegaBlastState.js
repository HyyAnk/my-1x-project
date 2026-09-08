import * as THREE from "three";

/**
 * STATE 4: MEGA_BLAST - colossal volumetric laser cannon fire at the zone
 * sphere with violent recoil, splayed limbs, and a giant impact shockwave.
 * Afterwards either TRANSITs to another duty waypoint or resumes PATROL.
 */
export class DroneMegaBlastState {
  constructor(context) {
    this.context = context; // { drone, camera, syncOrbitFromCurrentPos }
  }

  /** @returns {number} the next drone state index. */
  update(now, t) {
    const { drone, camera, syncOrbitFromCurrentPos } = this.context;
    const blastElapsed = now - drone.stateStartTime;
    const bp = Math.min(1.0, blastElapsed / (drone.blastDuration || 450));
    const pulse = Math.sin(bp * Math.PI);

    // Keep drone facing target sphere
    const dx = drone.zonePos.x - drone.group.position.x;
    const dy = drone.zonePos.y - drone.group.position.y;
    const dz = drone.zonePos.z - drone.group.position.z;
    drone.modelGroup.rotation.y = Math.atan2(dx, dz);
    const distHoriz = Math.hypot(dx, dz);
    drone.modelGroup.rotation.x = -Math.atan2(dy, distHoriz);
    drone.modelGroup.rotation.z = 0;

    // Violent cannon recoil kick backwards!
    const recoilDir = new THREE.Vector3(-dx, -dy, -dz).normalize();
    const kickAmount = pulse * 1.6;
    drone.group.position.x = drone.hoverPos.x + recoilDir.x * kickAmount + (Math.random() - 0.5) * 0.15;
    drone.group.position.y = drone.hoverPos.y + recoilDir.y * kickAmount + (Math.random() - 0.5) * 0.15;
    drone.group.position.z = drone.hoverPos.z + recoilDir.z * kickAmount + (Math.random() - 0.5) * 0.15;

    // Limbs splayed backward during cannon recoil
    if (drone.legs) {
      for (const leg of drone.legs) {
        leg.forearmGroup.rotation.z = leg.kneeBend - pulse * 0.35;
        leg.clawGroup.position.x = -pulse * 0.35;
      }
    }

    // Compute eye world position
    const vEye = new THREE.Vector3();
    if (drone.pupilMesh) {
      drone.pupilMesh.getWorldPosition(vEye);
    } else {
      vEye.copy(drone.group.position);
    }

    this.updateMegaBeam(drone, vEye, pulse);
    this.updateImpactFlare(drone, camera, bp, pulse);

    drone.droneLight.intensity = 5.0 * pulse;

    // Blast ends -> Resume patrol or transit
    if (bp >= 1.0) {
      return this.endBlast(drone, now, syncOrbitFromCurrentPos);
    }
    return 4;
  }

  // Colossal volumetric mega-beam from eye to zone sphere
  updateMegaBeam(drone, vEye, pulse) {
    if (!drone.megaBeamGroup) return;

    const targetPos = new THREE.Vector3(drone.zonePos.x, drone.zonePos.y, drone.zonePos.z);
    const beamVec = new THREE.Vector3().subVectors(targetPos, vEye);
    const dist = beamVec.length();
    const dir = beamVec.clone().normalize();

    drone.megaBeamGroup.visible = true;
    drone.megaBeamGroup.position.copy(vEye);
    drone.megaBeamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

    const radialScale = 1.0 + pulse * 0.8;
    drone.megaBeamGroup.scale.set(radialScale, dist, radialScale);
    if (drone.megaOuterMat) drone.megaOuterMat.opacity = 0.95 * pulse;
    if (drone.megaCoreMat) drone.megaCoreMat.opacity = 1.0 * pulse;
  }

  // Mega impact flare shockwave at target sphere
  updateImpactFlare(drone, camera, bp, pulse) {
    if (!drone.megaImpactFlare) return;
    drone.megaImpactFlare.visible = true;
    drone.megaImpactFlare.position.set(drone.zonePos.x, drone.zonePos.y, drone.zonePos.z);
    drone.megaImpactFlare.quaternion.copy(camera.quaternion);

    const flareScale = 1.0 + Math.pow(bp, 0.4) * 4.8;
    drone.megaImpactFlare.scale.set(flareScale, flareScale, 1.0);
    drone.megaImpactFlare.material.opacity = 0.95 * pulse;
  }

  endBlast(drone, now, syncOrbitFromCurrentPos) {
    if (drone.megaBeamGroup) drone.megaBeamGroup.visible = false;
    if (drone.megaImpactFlare) drone.megaImpactFlare.visible = false;
    if (drone.legs) {
      for (const leg of drone.legs) {
        leg.clawGroup.position.x = 0;
        leg.upperBoneGroup.rotation.z = leg.shoulderPitch;
        leg.forearmGroup.rotation.z = leg.kneeBend;
      }
    }

    drone.plannedFileIndex++;
    drone.patrolCyclesAtSphere = (drone.patrolCyclesAtSphere || 0) + 1;

    // Check if drone has completed 2 patrol cycles at this sphere before transiting
    const targetCycles = drone.maxPatrolCyclesAtSphere || 2;
    if (drone.patrolCyclesAtSphere >= targetCycles && drone.dutyWaypoints && drone.dutyWaypoints.length > 1) {
      return this.beginTransit(drone, now);
    }

    // Resume PATROL at current sphere
    syncOrbitFromCurrentPos(drone);
    if (Math.random() < 0.5) {
      drone.orbitDirection = -(drone.orbitDirection || 1);
    }
    drone.droneState = 0;
    drone.stateStartTime = now;
    drone.patrolDuration = 1800 + Math.random() * 1200;
    return 0;
  }

  beginTransit(drone, now) {
    drone.patrolCyclesAtSphere = 0;
    drone.maxPatrolCyclesAtSphere = 2;

    drone.droneState = 2; // Transition to TRANSIT
    drone.transitStartTime = now;
    drone.transitStartPos.copy(drone.group.position);

    // Randomly select next destination sphere from claim's red/yellow waypoints (avoiding current sphere)
    const otherWaypoints = drone.dutyWaypoints.filter((wp) => wp.zoneId !== drone.currentZoneId);
    const candidateWaypoints = otherWaypoints.length > 0 ? otherWaypoints : drone.dutyWaypoints;
    const nextWp = candidateWaypoints[Math.floor(Math.random() * candidateWaypoints.length)];
    drone.nextWaypoint = nextWp;

    const nextPos = nextWp.pos;
    const entryAngle = Math.random() * Math.PI * 2;
    const entryRadius = (nextPos.radius || 4) * 2.2 + 5.5 + Math.random() * 2.0;
    drone.transitTargetPos.set(
      nextPos.x + Math.cos(entryAngle) * entryRadius,
      nextPos.y + 7.5 + (Math.random() - 0.5) * 4.0,
      nextPos.z + Math.sin(entryAngle) * entryRadius,
    );

    const travelDist = drone.transitStartPos.distanceTo(drone.transitTargetPos);
    drone.transitDuration = Math.max(4800, Math.min(9000, 3200 + travelDist * 35));
    return 2;
  }
}
