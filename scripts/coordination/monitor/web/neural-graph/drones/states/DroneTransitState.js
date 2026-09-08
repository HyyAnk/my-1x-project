import * as THREE from "three";

/**
 * STATE 2: TRANSIT - dynamic inter-sphere flight between duty waypoints with
 * a parabolic clearance arc, dynamic banking, and aerodynamic leg sweep.
 * Resumes PATROL on waypoint arrival.
 */
export class DroneTransitState {
  constructor(context) {
    this.context = context; // { drone, syncOrbitFromCurrentPos }
  }

  /** @returns {number} the next drone state index. */
  update(now, t) {
    const { drone, syncOrbitFromCurrentPos } = this.context;
    const transitElapsed = now - drone.transitStartTime;
    const progress = Math.min(1.0, transitElapsed / drone.transitDuration);

    // Smooth cubic Hermite ease
    const ease = progress * progress * (3.0 - 2.0 * progress);

    // Interpolate horizontal position
    const curX = THREE.MathUtils.lerp(drone.transitStartPos.x, drone.transitTargetPos.x, ease);
    const curZ = THREE.MathUtils.lerp(drone.transitStartPos.z, drone.transitTargetPos.z, ease);
    // Upward parabolic clearance arc to soar cleanly over conduits
    const arcHeight = Math.sin(progress * Math.PI) * 7.5;
    const curY = THREE.MathUtils.lerp(drone.transitStartPos.y, drone.transitTargetPos.y, ease) + arcHeight;

    const prevPos = drone.group.position.clone();
    drone.group.position.set(curX, curY, curZ);

    this.applyFlightAttitude(drone, curX - prevPos.x, curY - prevPos.y, curZ - prevPos.z, curX, curZ);

    // Aerodynamic leg sweep during transit
    if (drone.legs) {
      for (const leg of drone.legs) {
        leg.upperBoneGroup.rotation.z = leg.shoulderPitch * 0.4;
        leg.forearmGroup.rotation.z = leg.kneeBend * 0.3;
        if (leg.bulletPool) {
          for (const bp of leg.bulletPool) {
            bp.bulletGroup.visible = false;
            bp.impactFlare.visible = false;
          }
        }
      }
    }

    // Powerful anti-gravity ion flare during inter-sphere burn
    if (drone.antiGravGlow) {
      const thrusterBurn = 1.3 + Math.sin(t * 25.0) * 0.25;
      drone.antiGravGlow.scale.set(thrusterBurn, thrusterBurn, thrusterBurn);
    }

    // Rapid flashing strobe beacon during transit
    drone.droneLight.intensity = 2.4 + Math.sin(t * 12.0) * 0.6;

    // Waypoint arrival
    if (progress >= 1.0) {
      return this.arriveAtWaypoint(drone, now, syncOrbitFromCurrentPos);
    }
    return 2;
  }

  applyFlightAttitude(drone, vx, vy, vz, curX, curZ) {
    const horizSpeed = Math.hypot(vx, vz);
    if (horizSpeed <= 0.005) return;

    const flightYaw = Math.atan2(vx, vz);
    drone.modelGroup.rotation.y = flightYaw;

    // Pitch follows vertical trajectory
    const flightPitch = -Math.atan2(vy, horizSpeed);
    drone.modelGroup.rotation.x = THREE.MathUtils.clamp(flightPitch, -0.35, 0.35);

    // Dynamic banking roll
    const targetDx = drone.transitTargetPos.x - curX;
    const targetDz = drone.transitTargetPos.z - curZ;
    const headingToTarget = Math.atan2(targetDx, targetDz);
    let angleDiff = headingToTarget - flightYaw;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    drone.modelGroup.rotation.z = THREE.MathUtils.clamp(-angleDiff * 0.8, -0.45, 0.45);
  }

  arriveAtWaypoint(drone, now, syncOrbitFromCurrentPos) {
    drone.currentWaypoint = drone.nextWaypoint;
    drone.currentZoneId = drone.currentWaypoint.zoneId;
    drone.zonePos = drone.currentWaypoint.pos;

    // SEAMLESS SYNCHRONIZATION: calculate wanderAngle directly from drone's current arrival position!
    syncOrbitFromCurrentPos(drone);

    // Randomize initial orbit direction (CW vs CCW) for the new sphere
    drone.orbitDirection = Math.random() > 0.5 ? 1 : -1;
    drone.patrolCyclesAtSphere = 0;
    drone.maxPatrolCyclesAtSphere = 2;

    if (drone.antiGravGlow) {
      drone.antiGravGlow.scale.set(1, 1, 1);
    }
    if (drone.legs) {
      for (const leg of drone.legs) {
        leg.upperBoneGroup.rotation.z = leg.shoulderPitch;
        leg.forearmGroup.rotation.z = leg.kneeBend;
      }
    }

    drone.droneState = 0; // Resume PATROL around new sphere
    drone.stateStartTime = now;
    drone.patrolDuration = 2000 + Math.random() * 800;
    return 0;
  }
}
