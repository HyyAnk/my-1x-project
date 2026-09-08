import * as THREE from "three";
import { ZONE_POSITIONS } from "../../topology-layout.js";

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 35, 175);
const DEFAULT_TARGET = new THREE.Vector3(0, 5, 0);

/**
 * Owns camera-mode state (0: orbit, 1: agent_follow, 2: top_down, 3: cockpit),
 * auto-rotate, smooth fly-to animation targets, and per-frame follow tracking.
 * The actual camera/controls objects live in SceneManager; this director only
 * computes animation targets and lerps camera positions toward them.
 */
export class CameraDirector {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.autoRotate = false;
    this.cameraAnimation = null;
    this.cameraMode = 0;
  }

  /** Returns a clone of the default camera position (never mutate the original). */
  defaultPosition() {
    return DEFAULT_CAMERA_POS.clone();
  }

  /** Queues a smooth fly-to animation above a zone macro-node. */
  flyToNode(zoneId) {
    const pos = ZONE_POSITIONS[zoneId];
    if (!pos) return;
    this.cameraAnimation = {
      targetPos: new THREE.Vector3(pos.x, pos.y + 10, pos.z + 45),
      targetLookAt: new THREE.Vector3(pos.x, pos.y, pos.z),
    };
  }

  /** Queues the default orbit view animation. */
  resetCamera() {
    this.sceneManager.controls.target.set(0, 5, 0);
    this.cameraAnimation = {
      targetPos: DEFAULT_CAMERA_POS.clone(),
      targetLookAt: new THREE.Vector3(0, 5, 0),
    };
  }

  /** Toggles OrbitControls auto-rotation. */
  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    this.sceneManager.controls.autoRotate = this.autoRotate;
    this.sceneManager.controls.autoRotateSpeed = 0.8;
  }

  /** Cycles to the next cinematic camera mode and applies it. */
  cycleCameraMode(agentDrones) {
    this.cameraMode = (this.cameraMode + 1) % 4;
    return this.applyCameraMode(agentDrones);
  }

  /** Applies an explicit camera mode index and returns its display label. */
  setCameraMode(modeIndex, agentDrones) {
    this.cameraMode = modeIndex % 4;
    return this.applyCameraMode(agentDrones);
  }

  applyCameraMode(agentDrones) {
    if (this.cameraMode === 0) {
      this.sceneManager.controls.target.set(0, 5, 0);
      this.cameraAnimation = {
        targetPos: DEFAULT_CAMERA_POS.clone(),
        targetLookAt: DEFAULT_TARGET.clone(),
      };
      return "Cam: Orbit";
    } else if (this.cameraMode === 1) {
      const activeDrones = agentDrones ? Array.from(agentDrones.values()).filter((d) => !d.isWarpingOut) : [];
      if (activeDrones.length > 0) {
        const drone = activeDrones[0];
        const dPos = drone.group.position;
        this.cameraAnimation = {
          targetPos: new THREE.Vector3(dPos.x + 22, dPos.y + 14, dPos.z + 32),
          targetLookAt: dPos.clone(),
        };
        return `Cam: ${drone.agentName}`;
      }
      this.cameraAnimation = {
        targetPos: new THREE.Vector3(0, 55, 120),
        targetLookAt: new THREE.Vector3(0, 30, 0),
      };
      return "Cam: Agent (Idle)";
    } else if (this.cameraMode === 2) {
      this.cameraAnimation = {
        targetPos: new THREE.Vector3(0, 210, 5),
        targetLookAt: new THREE.Vector3(0, 0, 0),
      };
      return "Cam: Top-Down";
    } else if (this.cameraMode === 3) {
      const corePos = ZONE_POSITIONS["shared-contracts"] || { x: 0, y: 0, z: 0 };
      this.cameraAnimation = {
        targetPos: new THREE.Vector3(corePos.x, corePos.y + 2, corePos.z + 4),
        targetLookAt: new THREE.Vector3(corePos.x + 60, corePos.y + 20, corePos.z - 30),
      };
      return "Cam: Cockpit";
    }
    return "Cam: Orbit";
  }

  /** Per-frame smooth fly-to interpolation. */
  updateAnimation() {
    const { camera, controls } = this.sceneManager;
    if (!this.cameraAnimation) return;

    camera.position.lerp(this.cameraAnimation.targetPos, 0.07);
    controls.target.lerp(this.cameraAnimation.targetLookAt, 0.07);
    if (camera.position.distanceTo(this.cameraAnimation.targetPos) < 0.2) {
      this.cameraAnimation = null;
    }
  }

  /** Per-frame agent-follow tracking when mode 1 is active and no animation runs. */
  updateFollowTracking(agentDrones) {
    if (this.cameraAnimation || this.cameraMode !== 1) return;
    const activeDrones = agentDrones ? Array.from(agentDrones.values()).filter((d) => !d.isWarpingOut) : [];
    if (activeDrones.length === 0) return;

    const drone = activeDrones[0];
    const dPos = drone.group.position;
    const desiredPos = new THREE.Vector3(dPos.x + 22, dPos.y + 14, dPos.z + 32);
    this.sceneManager.camera.position.lerp(desiredPos, 0.035);
    this.sceneManager.controls.target.lerp(dPos, 0.045);
  }
}
