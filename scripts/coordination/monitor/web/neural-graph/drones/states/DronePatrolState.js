import * as THREE from "three";

/**
 * STATE 0: PATROL - smooth organic 3D wander with helicopter-style vertical
 * sweeps, banking flight attitude, and organic leg swimming kinematics.
 * Transitions into LASER_FIRE on patrol-cycle completion or file targeting.
 */
export class DronePatrolState {
  constructor(context) {
    this.context = context; // { drone, fileNeuronSystem, camera }
  }

  /** @returns {number} the next drone state index. */
  update(now, t, stateElapsed) {
    const { drone, fileNeuronSystem } = this.context;
    // Variable speed modulation (alternates between slightly faster/slower)
    const speedWave = 0.72 + Math.sin(t * 0.85 + drone.seedR) * 0.32 + Math.cos(t * 1.5) * 0.12;
    const currentSpeed = (drone.baseWanderSpeed || 0.011) * speedWave;

    // Bidirectional orbit advance (CW vs CCW)
    drone.wanderAngle += currentSpeed * (drone.orbitDirection || 1);
    const wAngle = drone.wanderAngle;

    // Dynamic orbit radius with organic breathing
    const rMod = drone.orbitRadius + Math.sin(wAngle * 1.4 + drone.seedR) * 2.2;

    // Helicopter-style vertical altitude reconnaissance sweeps
    const verticalSweep = Math.sin(t * 0.65 + drone.seedY) * 5.2 + Math.sin(t * 1.35 + drone.seedPhase) * 1.8;

    const targetX = drone.zonePos.x + Math.cos(wAngle) * rMod + Math.sin(wAngle * 2.1) * 1.6;
    const targetZ = drone.zonePos.z + Math.sin(wAngle) * rMod + Math.cos(wAngle * 1.7) * 1.6;
    const targetY = drone.zonePos.y + 7.5 + verticalSweep;

    const curPos = drone.group.position;
    const prevX = curPos.x;
    const prevY = curPos.y;
    const prevZ = curPos.z;

    // Smooth position integration (eliminates any discontinuous jumps / pops)
    curPos.x = THREE.MathUtils.lerp(curPos.x, targetX, 0.08);
    curPos.y = THREE.MathUtils.lerp(curPos.y, targetY, 0.08);
    curPos.z = THREE.MathUtils.lerp(curPos.z, targetZ, 0.08);

    this.applyFlightAttitude(drone, curPos.x - prevX, curPos.y - prevY, curPos.z - prevZ, wAngle);

    // Anti-gravity stabilization ring idle pulse
    if (drone.antiGravGlow) {
      const pScale = 0.95 + Math.sin(t * 12.0) * 0.15;
      drone.antiGravGlow.scale.set(pScale, pScale, pScale);
    }

    this.animateLegs(drone, t);

    drone.droneLight.intensity = 1.8 + Math.sin(t * 5.0) * 0.3;

    // State transition check (responsive file edit or patrol cycle duration reached)
    const canTriggerTarget = drone.isTargetingFile && stateElapsed >= 1000;
    if (stateElapsed >= drone.patrolDuration || canTriggerTarget) {
      return this.beginLaserFire(drone, now, fileNeuronSystem);
    }
    return 0;
  }

  applyFlightAttitude(drone, vx, vy, vz, wAngle) {
    const horizSpeed = Math.hypot(vx, vz);
    if (horizSpeed <= 0.003) return;

    // Heading: face instantaneous movement direction
    const targetYaw = Math.atan2(vx, vz);
    drone.modelGroup.rotation.y = targetYaw;

    // Banking into turn (accounts for CW vs CCW direction)
    const bankAngle = THREE.MathUtils.clamp(-Math.sin(wAngle * 1.6) * 0.28 * (drone.orbitDirection || 1), -0.35, 0.35);
    drone.modelGroup.rotation.z = bankAngle;

    // Pitch follows vertical climb/descent
    const flightPitch = -Math.atan2(vy, horizSpeed);
    drone.modelGroup.rotation.x = THREE.MathUtils.clamp(flightPitch, -0.28, 0.28);
  }

  // 6 Legs Organic Breathing/Swimming Kinematics in Patrol
  animateLegs(drone, t) {
    if (!drone.legs) return;
    for (let i = 0; i < drone.legs.length; i++) {
      const leg = drone.legs[i];
      const legPhase = t * 2.2 + i * 1.05;
      leg.upperBoneGroup.rotation.z = leg.shoulderPitch + Math.sin(legPhase) * 0.05;
      leg.forearmGroup.rotation.z = leg.kneeBend + Math.sin(legPhase) * 0.08;
      leg.clawGroup.rotation.y = Math.sin(legPhase * 1.3) * 0.08;
      leg.clawGroup.position.x = 0;
      if (leg.bulletPool) {
        for (const bp of leg.bulletPool) {
          bp.bulletGroup.visible = false;
          bp.impactFlare.visible = false;
        }
      }
    }
  }

  beginLaserFire(drone, now, fileNeuronSystem) {
    drone.droneState = 1;
    drone.stateStartTime = now;
    drone.hoverPos = drone.group.position.clone();

    // Prepare candidate micro-neuron targets strictly within current zone
    const candidateTargets = [];
    if (drone.plannedFiles && drone.plannedFiles.length > 0) {
      for (const f of drone.plannedFiles) {
        const fn = fileNeuronSystem.fileNodes.get(f) || fileNeuronSystem.findFileNodeByName(f);
        if (fn && fn.zoneId === drone.currentZoneId && fn.worldPos) {
          candidateTargets.push({ pos: fn.worldPos.clone(), node: fn });
        }
      }
    }
    const zoneFiles = fileNeuronSystem.fileNodesByZone ? fileNeuronSystem.fileNodesByZone.get(drone.currentZoneId) : null;
    if (zoneFiles && zoneFiles.length > 0) {
      for (const fn of zoneFiles) {
        if (fn && fn.worldPos) {
          candidateTargets.push({ pos: fn.worldPos.clone(), node: fn });
        }
      }
    }

    const maxSalvoEnd = this.scheduleSalvo(drone, now, candidateTargets);
    drone.laserDuration = Math.max(1800, maxSalvoEnd - now + 200);
    return 1;
  }

  // Schedule independent multi-shot green laser bullet salvos across all 6 legs
  scheduleSalvo(drone, now, candidateTargets) {
    let maxSalvoEnd = now;
    const sphereR = drone.zonePos.radius || 4.0;
    const getRandomMicroTarget = () => {
      if (candidateTargets.length > 0) {
        return candidateTargets[Math.floor(Math.random() * candidateTargets.length)];
      }
      const th = Math.random() * Math.PI * 2;
      const ph = (Math.random() - 0.5) * Math.PI * 0.8;
      const r = sphereR * (0.65 + Math.random() * 0.35);
      return {
        pos: new THREE.Vector3(
          drone.zonePos.x + r * Math.cos(ph) * Math.cos(th),
          drone.zonePos.y + r * Math.sin(ph),
          drone.zonePos.z + r * Math.cos(ph) * Math.sin(th),
        ),
        node: null,
      };
    };

    if (!drone.legs) return maxSalvoEnd;

    for (const leg of drone.legs) {
      // Staggered delay: 0.1s to 0.5s after hover stop
      const startDelay = 100 + Math.random() * 400;
      // 2 to 5 random shots per leg
      const shotCount = 2 + Math.floor(Math.random() * 4);
      // 0.3s to 0.7s interval between shots
      const interval = 300 + Math.random() * 380;
      const flightDuration = 220; // 220ms green plasma projectile streak

      const shots = [];
      for (let s = 0; s < shotCount; s++) {
        const fireTime = now + startDelay + s * interval;
        const hitTime = fireTime + flightDuration;
        const impactEndTime = hitTime + 240; // 240ms green impact plasma shockwave
        const target = getRandomMicroTarget();
        const bulletItem = leg.bulletPool ? leg.bulletPool[s % leg.bulletPool.length] : null;
        shots.push({
          fireTime,
          hitTime,
          impactEndTime,
          targetPos: target.pos,
          targetNode: target.node,
          muzzlePos: null,
          bulletItem,
          hasFired: false,
          excited: false,
        });
        if (impactEndTime > maxSalvoEnd) {
          maxSalvoEnd = impactEndTime;
        }
      }
      leg.salvo = {
        shots,
      };
    }
    return maxSalvoEnd;
  }
}
