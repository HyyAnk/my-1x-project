import * as THREE from "three";
import { COLOR_MAP } from "../../topology-layout.js";

/**
 * Purely imperative per-frame animation of the zone macro-neurons:
 * active/idle gyroscopic spin, synaptic excitation decay, stale heartbeat
 * strobe, and drone mega-blast chromatic gradient surges.
 */
export class ZoneNodeAnimator {
  constructor(zoneNodeSystem) {
    this.zoneNodeSystem = zoneNodeSystem;
  }

  /** @param {number} now Current time in ms. @param {number} t Time in seconds. */
  update(now, t, coordinationState, hoveredZoneId) {
    for (const [id, node] of this.zoneNodeSystem.nodeMeshes) {
      const zState = coordinationState?.zones?.find((z) => z.id === id);
      const isActive = zState?.status === "active";
      const isHovered = hoveredZoneId === id;

      if (isActive) {
        this.animateActiveNode(node, isHovered);
      } else {
        this.animateIdleNode(node, isHovered);
      }

      this.applyExcitation(node);
      this.applyStaleHeartbeatStrobe(node, zState, t);
      this.applyGradientSurge(node, now, t);
    }
  }

  animateActiveNode(node, isHovered) {
    const activeScale = isHovered ? 1.2 : 1.08;
    node.coreMesh.scale.set(activeScale, activeScale, activeScale);

    // Gentle crystalline cage rotation
    node.latticeMesh.rotation.y += 0.015;
    node.latticeMesh.rotation.x += 0.01;
    node.latticeMesh.rotation.z += 0.008;
    node.latticeMesh.material.opacity = 0.65;

    // Smooth gyroscopic orbital spin
    const activeGyroSpeed = 0.035;
    node.gyroRing1.rotation.x += activeGyroSpeed;
    node.gyroRing1.rotation.z += activeGyroSpeed * 0.7;
    node.gyroRing2.rotation.y += activeGyroSpeed * 1.2;
    node.gyroRing2.rotation.x += activeGyroSpeed * 0.6;

    node.pointLight.intensity = 1.8;
  }

  animateIdleNode(node, isHovered) {
    const scale = isHovered ? 1.15 : 1.0;
    node.coreMesh.scale.set(scale, scale, scale);

    node.latticeMesh.rotation.y += 0.004;
    node.latticeMesh.rotation.x += 0.002;

    const spinSpeed = node.spinSpeed || 0.008;
    node.gyroRing1.rotation.x += spinSpeed;
    node.gyroRing1.rotation.z += spinSpeed * 0.4;
    node.gyroRing2.rotation.y += spinSpeed * 1.1;
    node.gyroRing2.rotation.x += spinSpeed * 0.5;
  }

  // Synaptic excitation: clean energy surge & gentle decay, no particles
  applyExcitation(node) {
    if (node.excitation > 0) {
      node.excitation = Math.max(0, node.excitation - 0.0035);
      const excScale = 1.0 + node.excitation * 0.15;
      node.coreMesh.scale.multiplyScalar(excScale);
      node.coreMesh.material.emissiveIntensity = Math.max(node.coreMesh.material.emissiveIntensity, 0.7 + node.excitation * 1.8);
      node.pointLight.intensity = Math.max(node.pointLight.intensity, 0.8 + node.excitation * 1.4);
    }
  }

  // Stale claim warning strobe
  applyStaleHeartbeatStrobe(node, zState, t) {
    if (zState?.hasStaleHeartbeat) {
      const strobe = Math.sin(t * 18) > 0 ? 0.2 : 1.4;
      node.coreMesh.material.emissiveIntensity = strobe;
      node.coreMesh.material.emissive.setHex(0xff0055);
    }
  }

  // Dynamic chromatic gradient surge triggered by drone mega-laser for 3.0s
  applyGradientSurge(node, now, t) {
    if (!node.gradientSurge) return;

    const surgeElapsed = now - node.gradientSurge.startTime;
    const surgeProgress = surgeElapsed / (node.gradientSurge.duration || 3000);
    if (surgeProgress >= 1.0) {
      // Surge completed -> restore standard base color
      node.gradientSurge = null;
      const baseCol = node.baseColor || COLOR_MAP.active;
      node.coreMesh.material.color.setHex(baseCol);
      node.coreMesh.material.emissive.setHex(baseCol);
      node.coreMesh.material.emissiveIntensity = 1.15;
      node.latticeMesh.material.color.setHex(baseCol);
      node.latticeMesh.material.opacity = 0.65;
      node.gyroRing1.material.color.setHex(baseCol);
      node.gyroRing2.material.color.setHex(baseCol);
      node.pointLight.color.setHex(baseCol);
      node.pointLight.intensity = 1.8;
      return;
    }

    // Flowing rainbow/chromatic gradient cycle
    const hue = (t * 2.2 + surgeProgress * 3.5) % 1.0;
    const surgeColor = new THREE.Color().setHSL(hue, 1.0, 0.58);
    node.coreMesh.material.color.copy(surgeColor);
    node.coreMesh.material.emissive.copy(surgeColor);
    node.coreMesh.material.emissiveIntensity = 1.6 + Math.sin(t * 12.0) * 0.4;
    node.latticeMesh.material.color.copy(surgeColor);
    node.latticeMesh.material.opacity = 0.85;
    node.gyroRing1.material.color.copy(surgeColor);
    node.gyroRing2.material.color.copy(surgeColor);
    node.pointLight.color.copy(surgeColor);
    node.pointLight.intensity = 2.4;
  }
}
