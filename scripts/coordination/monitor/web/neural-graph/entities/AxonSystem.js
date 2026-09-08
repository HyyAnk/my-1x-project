import * as THREE from "three";
import { ZONE_POSITIONS } from "../../topology-layout.js";

/**
 * Builds and owns the synaptic axon conduits between zones (volumetric optical
 * tubes + razor-fine laser filaments) and provides state-driven recoloring,
 * safe-zone highlighting, and per-frame hover/active animation.
 */
export class AxonSystem {
  constructor(scene) {
    this.scene = scene;
    this.axonLines = [];
  }

  /**
   * Builds curved axon conduits from topology links.
   * @returns {Set<string>} Pair keys of every direct connection created.
   */
  buildAxons(links) {
    const existingPairs = new Set();
    for (const link of links) {
      const srcPos = ZONE_POSITIONS[link.source];
      const tgtPos = ZONE_POSITIONS[link.target];
      if (!srcPos || !tgtPos) continue;

      existingPairs.add(`${link.source}->${link.target}`);
      existingPairs.add(`${link.target}->${link.source}`);

      this.createAxon(srcPos, tgtPos, link);
    }
    return existingPairs;
  }

  createAxon(srcPos, tgtPos, link) {
    const p1 = new THREE.Vector3(srcPos.x, srcPos.y, srcPos.z);
    const p2 = new THREE.Vector3(tgtPos.x, tgtPos.y, tgtPos.z);

    // Curved control point via elevated midpoint
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const normal = mid.clone().normalize().multiplyScalar(14);
    const cp = mid.add(normal);

    const curve = new THREE.QuadraticBezierCurve3(p1, cp, p2);

    // 3D Volumetric Optical Light Conduit (Tube)
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.22, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const conduit = new THREE.Mesh(tubeGeo, tubeMat);
    this.scene.add(conduit);

    // Razor-fine core laser filament
    const points = curve.getPoints(36);
    const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
    const curveMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
    });
    const line = new THREE.Line(curveGeo, curveMat);
    this.scene.add(line);

    this.axonLines.push({
      source: link.source,
      target: link.target,
      conduit,
      line,
      curve,
      phase: Math.random() * Math.PI * 2,
      isHovered: false,
      isActive: false,
    });
  }

  /** Recolors axons based on which endpoints are actively claimed. */
  applyState(activeZoneIds) {
    for (const axon of this.axonLines) {
      const isConnectedToActive = activeZoneIds.has(axon.source) || activeZoneIds.has(axon.target);
      axon.isActive = isConnectedToActive;

      const pColor = isConnectedToActive ? 0xff0055 : 0x00f0ff;
      const pScale = isConnectedToActive ? 1.35 : 0.85;
      const pSpeed = isConnectedToActive ? 0.012 : 0.0035;

      axon.line.material.color.setHex(pColor);
      axon.line.material.opacity = isConnectedToActive ? 0.65 : 0.22;

      if (axon.conduit) {
        axon.conduit.material.color.setHex(pColor);
        axon.conduit.material.opacity = isConnectedToActive ? 0.55 : 0.14;
      }

      if (axon.particles) {
        for (const p of axon.particles) {
          p.mesh.material.color.setHex(pColor);
          p.mesh.scale.set(pScale, pScale * 1.5, pScale);
          p.speed = pSpeed + Math.random() * 0.001;
        }
      }
    }
  }

  /** Amber/green/dim highlight pass for Find-Safe-Zones mode. */
  applySafeZoneHighlights(targetZoneId, safeSet) {
    for (const axon of this.axonLines) {
      const isTargetConnected = axon.source === targetZoneId || axon.target === targetZoneId;
      if (isTargetConnected) {
        axon.line.material.color.setHex(0xf59e0b);
        axon.line.material.opacity = 0.85;
        if (axon.conduit) {
          axon.conduit.material.color.setHex(0x10b981);
          axon.conduit.material.opacity = 0.65;
        }
        if (axon.particles) {
          for (const p of axon.particles) {
            p.mesh.material.color.setHex(0x10b981);
            p.mesh.visible = true;
          }
        }
      } else {
        axon.line.material.color.setHex(0x334155);
        axon.line.material.opacity = 0.06;
        if (axon.conduit) {
          axon.conduit.material.color.setHex(0x334155);
          axon.conduit.material.opacity = 0.02;
        }
        if (axon.particles) {
          for (const p of axon.particles) {
            p.mesh.visible = false;
          }
        }
      }
    }
  }

  /** Restores particle visibility after safe-zone mode ends. */
  clearSafeZoneHighlights() {
    for (const axon of this.axonLines) {
      if (axon.particles) {
        for (const p of axon.particles) {
          p.mesh.visible = true;
        }
      }
    }
  }

  /** Per-frame opacity/color animation driven by hover and active status. */
  update(hoveredZoneId, safeZoneModeActive) {
    for (const axon of this.axonLines) {
      const isLineConnectedToHover = hoveredZoneId && (axon.source === hoveredZoneId || axon.target === hoveredZoneId);

      if (axon.isActive) {
        if (axon.conduit) {
          axon.conduit.material.opacity = 0.65;
          axon.conduit.material.color.setHex(0xff0055);
        }
        axon.line.material.opacity = 0.85;
        axon.line.material.color.setHex(0xff0055);
      } else if (isLineConnectedToHover) {
        axon.line.material.opacity = 0.95;
        axon.line.material.color.setHex(0x00ffff);
        if (axon.conduit) {
          axon.conduit.material.opacity = 0.82;
          axon.conduit.material.color.setHex(0x00ffff);
        }
      } else if (!safeZoneModeActive) {
        if (axon.conduit) {
          axon.conduit.material.opacity = 0.16;
        }
        axon.line.material.opacity = 0.24;
      }
    }
  }
}
