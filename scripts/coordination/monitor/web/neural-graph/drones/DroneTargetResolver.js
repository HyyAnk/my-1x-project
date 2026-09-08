import * as THREE from "three";

/**
 * Resolves the drone's current inspection target strictly within its current
 * zone: (1) a recently excited file in this zone, (2) the next planned file
 * belonging to this zone, (3) any existing micro-neuron in this zone, or
 * (4) a surface diagnostic point on the zone sphere.
 */
export class DroneTargetResolver {
  constructor(fileNeuronSystem) {
    this.fileNeuronSystem = fileNeuronSystem;
  }

  /**
   * @param {object} drone Mutable drone record.
   * @param {number} now Current time in ms.
   * @returns {THREE.Vector3} World-space target coordinates.
   */
  resolve(drone, now) {
    const targetCoord = new THREE.Vector3(drone.zonePos.x, drone.zonePos.y, drone.zonePos.z);
    let hasSpecificTarget = false;

    // 1. Actively targeting a recently excited file strictly in THIS zone
    if (drone.isTargetingFile && drone.targetPos && drone.targetZoneId === drone.currentZoneId) {
      if (now > drone.targetTimer) {
        drone.isTargetingFile = false;
      } else {
        targetCoord.copy(drone.targetPos);
        hasSpecificTarget = true;
      }
    }

    // 2. Cycle through planned files belonging to THIS zone
    if (!hasSpecificTarget && drone.plannedFiles && drone.plannedFiles.length > 0) {
      const filesInThisZone = drone.plannedFiles.filter((f) => {
        const fn = this.fileNeuronSystem.fileNodes.get(f) || this.fileNeuronSystem.findFileNodeByName(f);
        return fn && fn.zoneId === drone.currentZoneId;
      });
      if (filesInThisZone.length > 0) {
        const fileKey = filesInThisZone[drone.plannedFileIndex % filesInThisZone.length];
        const fileNode = this.fileNeuronSystem.fileNodes.get(fileKey) || this.fileNeuronSystem.findFileNodeByName(fileKey);
        if (fileNode && fileNode.worldPos) {
          targetCoord.copy(fileNode.worldPos);
          hasSpecificTarget = true;
        }
      }
    }

    // 3. Fallback: inspect existing micro-neuron in this zone or surface diagnostic point
    if (!hasSpecificTarget) {
      const zoneFileNodes = this.fileNeuronSystem.fileNodesByZone ? this.fileNeuronSystem.fileNodesByZone.get(drone.currentZoneId) : null;
      if (zoneFileNodes && zoneFileNodes.length > 0) {
        const fn = zoneFileNodes[drone.plannedFileIndex % zoneFileNodes.length];
        if (fn && fn.worldPos) {
          targetCoord.copy(fn.worldPos);
          hasSpecificTarget = true;
        }
      }
      if (!hasSpecificTarget) {
        const sphereR = drone.zonePos.radius || 4.0;
        const angle = drone.wanderAngle || 0;
        targetCoord.set(
          drone.zonePos.x + Math.cos(angle) * (sphereR * 0.9),
          drone.zonePos.y + Math.sin(angle * 1.5) * (sphereR * 0.4),
          drone.zonePos.z + Math.sin(angle) * (sphereR * 0.9),
        );
      }
    }

    return targetCoord;
  }

  /** Finds the first drone of the named agent stationed in the given zone. */
  findAgentDroneInZone(agentDrones, agentName, zoneId) {
    for (const drone of agentDrones.values()) {
      if (drone.agentName === agent && drone.currentZoneId === zoneId) {
        return drone;
      }
    }
    return null;
  }
}
