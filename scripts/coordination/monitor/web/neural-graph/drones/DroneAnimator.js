import { DronePatrolState } from "./states/DronePatrolState.js";
import { DroneLaserFireState } from "./states/DroneLaserFireState.js";
import { DroneTransitState } from "./states/DroneTransitState.js";
import { DroneEyeChargeState } from "./states/DroneEyeChargeState.js";
import { DroneMegaBlastState } from "./states/DroneMegaBlastState.js";
import { DroneTargetResolver } from "./DroneTargetResolver.js";

const STATE_PATROL = 0;
const STATE_LASER_FIRE = 1;
const STATE_TRANSIT = 2;
const STATE_EYE_CHARGE = 3;
const STATE_MEGA_BLAST = 4;

/**
 * Per-frame animator for the agent cyber drone fleet. Delegates each drone's
 * 5-phase state machine (PATROL -> LASER_FIRE -> EYE_CHARGE -> MEGA_BLAST ->
 * TRANSIT) to dedicated state classes and handles warp-out disposal.
 */
export class DroneAnimator {
  constructor(agentDroneSystem, scene, camera, fileNeuronSystem, zoneNodeSystem) {
    this.agentDroneSystem = agentDroneSystem;
    this.camera = camera;
    this.fileNeuronSystem = fileNeuronSystem;
    const syncOrbit = (drone) => agentDroneSystem.syncDroneOrbitFromCurrentPos(drone);

    // State classes receive only the cross-module references they need.
    this.states = {
      [STATE_PATROL]: new DronePatrolState({ fileNeuronSystem }),
      [STATE_LASER_FIRE]: new DroneLaserFireState({ camera }),
      [STATE_TRANSIT]: new DroneTransitState({ syncOrbitFromCurrentPos: syncOrbit }),
      [STATE_EYE_CHARGE]: new DroneEyeChargeState({ zoneNodeSystem }),
      [STATE_MEGA_BLAST]: new DroneMegaBlastState({ camera, syncOrbitFromCurrentPos: syncOrbit }),
    };
    this.targetResolver = new DroneTargetResolver(fileNeuronSystem);
  }

  /** Advances every drone by one frame. */
  update(now, t) {
    const agentDrones = this.agentDroneSystem.agentDrones;
    for (const [claimId, drone] of agentDrones.entries()) {
      if (drone.isWarpingOut) {
        this.animateWarpOut(drone, claimId);
        continue;
      }

      drone.scale = Math.min(drone.targetScale || 1.4, drone.scale + 0.06);
      drone.group.scale.set(drone.scale, drone.scale, drone.scale);

      // Resolve current target coordinates STRICTLY within drone.currentZoneId
      this.targetResolver.resolve(drone, now);

      const stateElapsed = now - drone.stateStartTime;
      this.updateOpticalCore(drone, t);

      const state = this.states[drone.droneState];
      if (state) {
        drone.droneState = state.update(now, t, stateElapsed);
      }
    }
  }

  // Optical eye core pulsing & themed joint trim glow (shared across states)
  updateOpticalCore(drone, t) {
    if (drone.pupilMesh) {
      const pupilPulse = 1.0 + Math.sin(t * 8.0) * 0.08;
      drone.pupilMesh.scale.set(pupilPulse, pupilPulse, 0.3);
    }
    if (drone.accentTrimMeshes && drone.accentTrimMeshes.length > 0) {
      const trimWave = 0.75 + 0.25 * Math.sin(t * 5.0);
      for (const tm of drone.accentTrimMeshes) {
        if (tm.material) tm.material.opacity = trimWave;
      }
    }
  }

  // Scale-down + lift-off warp-out animation, then disposal.
  animateWarpOut(drone, claimId) {
    drone.scale = Math.max(0, drone.scale - 0.06);
    drone.group.scale.set(drone.scale, drone.scale, drone.scale);
    drone.group.position.y += 0.3;
    if (drone.legs) {
      for (const leg of drone.legs) {
        if (leg.bulletPool) {
          for (const bp of leg.bulletPool) {
            bp.bulletGroup.visible = false;
            bp.impactFlare.visible = false;
          }
        }
      }
    }
    if (drone.scale <= 0.02) {
      this.agentDroneSystem.disposeDrone(drone);
      this.agentDroneSystem.agentDrones.delete(claimId);
    }
  }
}
