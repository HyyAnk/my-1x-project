import * as THREE from "three";

/**
 * STATE 3: EYE_CHARGE - 2.0s ocular plasma condensation in front of the eye
 * with escalating turbulence jitter, tensing legs, accelerating accretion
 * rings, and a blinding pupil pulse. Fires the MEGA_BLAST on completion and
 * triggers the chromatic gradient surge on the target zone node.
 */
export class DroneEyeChargeState {
  constructor(context) {
    this.context = context; // { drone, zoneNodeSystem }
  }

  /** @returns {number} the next drone state index. */
  update(now, t) {
    const { drone, zoneNodeSystem } = this.context;
    const chargeElapsed = now - drone.stateStartTime;
    const cp = Math.min(1.0, chargeElapsed / (drone.chargeDuration || 2000));

    // Keep drone oriented toward claimed zone sphere
    const dx = drone.zonePos.x - drone.group.position.x;
    const dy = drone.zonePos.y - drone.group.position.y;
    const dz = drone.zonePos.z - drone.group.position.z;
    drone.modelGroup.rotation.y = Math.atan2(dx, dz);
    const distHoriz = Math.hypot(dx, dz);
    drone.modelGroup.rotation.x = -Math.atan2(dy, distHoriz);
    drone.modelGroup.rotation.z = 0;

    // Hover position with escalating plasma turbulence jitter
    const jitter = 0.02 + cp * 0.12;
    drone.group.position.x = drone.hoverPos.x + (Math.random() - 0.5) * jitter;
    drone.group.position.y = drone.hoverPos.y + (Math.random() - 0.5) * jitter;
    drone.group.position.z = drone.hoverPos.z + (Math.random() - 0.5) * jitter;

    // Limbs tense up and brace backward in anticipation of mega-blast
    if (drone.legs) {
      for (const leg of drone.legs) {
        leg.forearmGroup.rotation.z = THREE.MathUtils.lerp(leg.forearmGroup.rotation.z, leg.kneeBend - cp * 0.25, 0.2);
        leg.clawGroup.position.x = THREE.MathUtils.lerp(leg.clawGroup.position.x, -cp * 0.15, 0.2);
      }
    }

    // Plasma sphere synthesizes and grows directly in front of the eye over 2.0s
    if (drone.chargingOrbGroup) {
      drone.chargingOrbGroup.visible = true;
      const orbScale = 0.08 + Math.pow(cp, 0.8) * 1.55;
      drone.chargingOrbGroup.scale.set(orbScale, orbScale, orbScale);

      // Accretion rings accelerate rotation
      if (drone.accretionRing1) {
        drone.accretionRing1.rotation.z += 0.08 + cp * 0.25;
      }
      if (drone.accretionRing2) {
        drone.accretionRing2.rotation.x += 0.06 + cp * 0.22;
      }
    }

    // Optical eye pupil pulses with blinding intensity
    if (drone.pupilMesh) {
      const pupilPulse = 1.0 + cp * 0.45 + Math.sin(t * (10.0 + cp * 25.0)) * 0.12;
      drone.pupilMesh.scale.set(pupilPulse, pupilPulse, 0.3);
    }
    drone.droneLight.intensity = 2.0 + cp * 3.5;

    // Charge complete (2.0s reached) -> Fire colossal mega-blast!
    if (cp >= 1.0) {
      return this.beginMegaBlast(drone, now, zoneNodeSystem);
    }
    return 3;
  }

  beginMegaBlast(drone, now, zoneNodeSystem) {
    drone.droneState = 4;
    drone.stateStartTime = now;
    drone.blastDuration = 450;
    if (drone.chargingOrbGroup) drone.chargingOrbGroup.visible = false;
    if (drone.megaBeamGroup) drone.megaBeamGroup.visible = true;
    if (drone.megaImpactFlare) drone.megaImpactFlare.visible = true;

    // Trigger 3.0s chromatic gradient surge on target zone sphere
    const zoneNode = zoneNodeSystem.nodeMeshes.get(drone.currentZoneId);
    if (zoneNode) {
      zoneNode.gradientSurge = {
        startTime: now,
        duration: 3000,
      };
    }
    return 4;
  }
}
