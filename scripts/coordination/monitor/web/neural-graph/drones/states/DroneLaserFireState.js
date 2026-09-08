import * as THREE from "three";

/**
 * STATE 1: LASER_FIRE - stabilized hover with recoil micro-jitter while all
 * 6 legs fire staggered green plasma bullet salvos at zone micro-neurons.
 * Transitions into EYE_CHARGE once every salvo completes.
 */
export class DroneLaserFireState {
  constructor(context) {
    this.context = context; // { drone, camera }
  }

  /** @returns {number} the next drone state index. */
  update(now, t, stateElapsed) {
    const { drone, camera } = this.context;

    // Hover with laser weapon recoil micro-jitter
    drone.group.position.x = drone.hoverPos.x + (Math.random() - 0.5) * 0.08;
    drone.group.position.y = drone.hoverPos.y + Math.sin(t * 6.0) * 0.15 + (Math.random() - 0.5) * 0.08;
    drone.group.position.z = drone.hoverPos.z + (Math.random() - 0.5) * 0.08;

    // Keep model oriented toward zone center
    const dx = drone.zonePos.x - drone.group.position.x;
    const dy = drone.zonePos.y - drone.group.position.y;
    const dz = drone.zonePos.z - drone.group.position.z;
    drone.modelGroup.rotation.y = Math.atan2(dx, dz);
    const distHoriz = Math.hypot(dx, dz);
    drone.modelGroup.rotation.x = -Math.atan2(dy, distHoriz);
    drone.modelGroup.rotation.z = 0;

    const vEmitter = new THREE.Vector3();
    let anyFiring = false;

    if (drone.legs) {
      for (const leg of drone.legs) {
        const result = this.fireLegSalvo(leg, now, camera, vEmitter);
        anyFiring = anyFiring || result.firing;
        const legAimTarget = result.aimTarget;

        // Aim the forearm and claw toward target when firing or preparing to fire
        if (legAimTarget) {
          const localTarget = leg.elbowGroup.worldToLocal(legAimTarget.clone());
          const aimAngle = Math.atan2(localTarget.y, localTarget.x);
          leg.forearmGroup.rotation.z = THREE.MathUtils.lerp(leg.forearmGroup.rotation.z, aimAngle, 0.35);
        } else {
          leg.clawGroup.position.x = THREE.MathUtils.lerp(leg.clawGroup.position.x, 0, 0.15);
          leg.forearmGroup.rotation.z = THREE.MathUtils.lerp(leg.forearmGroup.rotation.z, leg.kneeBend, 0.1);
        }
      }
    }

    // Optical core flashes brighter when any turret is firing
    if (drone.pupilMesh) {
      drone.pupilMesh.scale.setScalar(anyFiring ? 1.25 : 1.0 + Math.sin(t * 10.0) * 0.05);
    }
    drone.droneLight.intensity = anyFiring ? 3.2 : 1.8;

    // State transition check: after all 6 legs finish firing salvos, transition to eye charge!
    if (stateElapsed >= drone.laserDuration) {
      return this.beginEyeCharge(drone, now);
    }
    return 1;
  }

  /** Runs one leg's scheduled shots; returns the current aim target or null. */
  fireLegSalvo(leg, now, camera, vEmitter) {
    let legAimTarget = null;
    let legIsFiring = false;
    if (!leg.salvo || !leg.salvo.shots) return null;

    for (const shot of leg.salvo.shots) {
      const { fireTime, hitTime, impactEndTime, targetPos, bulletItem } = shot;

      // 1. Green Laser Plasma Bullet in Flight (fireTime to hitTime)
      if (now >= fireTime && now < hitTime) {
        legAimTarget = targetPos;
        legIsFiring = true;

        if (!shot.hasFired) {
          shot.hasFired = true;
          leg.emitterMarker.getWorldPosition(vEmitter);
          shot.muzzlePos = vEmitter.clone();
        }

        const flightProgress = (now - fireTime) / (hitTime - fireTime);
        const p = Math.max(0, Math.min(1.0, flightProgress));

        if (bulletItem && shot.muzzlePos) {
          bulletItem.bulletGroup.visible = true;
          bulletItem.bulletGroup.position.lerpVectors(shot.muzzlePos, targetPos, p);

          const dir = new THREE.Vector3().subVectors(targetPos, shot.muzzlePos).normalize();
          bulletItem.bulletGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

          // Dynamic stretch along flight vector
          bulletItem.bulletGroup.scale.set(1.0, 1.0 + Math.sin(p * Math.PI) * 0.45, 1.0);
        }

        // Mechanical claw recoil kick on discharge
        leg.clawGroup.position.x = -Math.sin(p * Math.PI) * 0.28;
      }

      // 2. Green Plasma Impact Shockwave on Micro-Neuron Contact (hitTime to impactEndTime)
      else if (now >= hitTime && now < impactEndTime) {
        if (bulletItem) {
          bulletItem.bulletGroup.visible = false;
        }

        const impactProgress = (now - hitTime) / (impactEndTime - hitTime);
        const ip = Math.max(0, Math.min(1.0, impactProgress));

        if (bulletItem && bulletItem.impactFlare) {
          bulletItem.impactFlare.visible = true;
          bulletItem.impactFlare.position.copy(targetPos);
          bulletItem.impactFlare.quaternion.copy(camera.quaternion);

          const flareScale = 1.0 + Math.pow(ip, 0.4) * 2.2;
          bulletItem.impactFlare.scale.set(flareScale, flareScale, 1.0);
          bulletItem.impactFlare.material.opacity = Math.sin((1.0 - ip) * Math.PI) * 0.95;
        }

        // Synaptic excitation on target micro-neuron once at hit
        if (!shot.excited) {
          shot.excited = true;
          if (shot.targetNode) {
            shot.targetNode.orbitalSurge = 1.0;
            shot.targetNode.wasDendriteSurging = true;
          }
        }
      }

      // 3. Inactive shot state
      else {
        if (bulletItem) {
          if (now >= impactEndTime) {
            bulletItem.impactFlare.visible = false;
          }
          if (now < fireTime) {
            bulletItem.bulletGroup.visible = false;
            bulletItem.impactFlare.visible = false;
          }
        }
      }

      // Anticipatory claw aiming 120ms before fire
      if (!legAimTarget && now >= fireTime - 120 && now < fireTime) {
        legAimTarget = targetPos;
      }
    }

    return legIsFiring ? { firing: true, aimTarget: legAimTarget } : { firing: false, aimTarget: legAimTarget };
  }

  beginEyeCharge(drone, now) {
    if (drone.legs) {
      for (const leg of drone.legs) {
        if (leg.bulletPool) {
          for (const bp of leg.bulletPool) {
            bp.bulletGroup.visible = false;
            bp.impactFlare.visible = false;
          }
        }
        leg.clawGroup.position.x = 0;
        leg.forearmGroup.rotation.z = leg.kneeBend;
      }
    }

    // Transition to STATE 3: EYE_CHARGE
    drone.droneState = 3;
    drone.stateStartTime = now;
    drone.chargeDuration = 2000;
    if (drone.chargingOrbGroup) {
      drone.chargingOrbGroup.visible = true;
      drone.chargingOrbGroup.scale.set(0.05, 0.05, 0.05);
    }
    return 3;
  }
}
