import * as THREE from "three";

const EXCITATION_DURATION_MS = 10000;

/**
 * Per-frame animator for the file micro-neuron galaxy: slow cosmic orbital
 * rotation around zone centers, synaptic excitation flashes, dendrite surges,
 * and the thermodynamic heatmap gradient. Heat state is owned by
 * HeatmapShaderSystem and passed in via the `heatmap` parameter.
 */
export class FileNeuronAnimator {
  constructor(fileNeuronSystem) {
    this.fileNeuronSystem = fileNeuronSystem;
  }

  /**
   * @param {number} now Current time in ms.
   * @param {number} t Time in seconds.
   * @param {{ fileHeatMap: Map, heatmapMode: boolean }} heatmap
   */
  update(now, t, heatmap) {
    const { fileInstancedMesh, dendriteLineSegments, fileNodesByIndex, zoneOrbitalData } = this.fileNeuronSystem;
    if (!fileInstancedMesh || !dendriteLineSegments) return;

    const posAttr = dendriteLineSegments.geometry.attributes.position;
    const colAttr = dendriteLineSegments.geometry.attributes.color;
    const dendritePosArray = posAttr.array;
    const dendriteColArray = colAttr ? colAttr.array : null;
    const dummy = new THREE.Object3D();
    let needsColorUpdate = false;
    let needsDendriteColorUpdate = false;

    // 1. Precompute orbital rotation (cos, sin) for each zone at current time t
    const zoneRotations = new Map();
    for (const [zoneId, orb] of zoneOrbitalData.entries()) {
      const angle = t * orb.speed + orb.phase;
      zoneRotations.set(zoneId, {
        cos: Math.cos(angle),
        sin: Math.sin(angle),
        speed: orb.speed,
      });
    }

    // 2. Transform each file micro-neuron and its connecting dendrite filament
    for (let i = 0; i < fileNodesByIndex.length; i++) {
      const fileNode = fileNodesByIndex[i];
      const rot = zoneRotations.get(fileNode.zoneId);
      const cos = rot ? rot.cos : 1;
      const sin = rot ? rot.sin : 0;

      // Smooth celestial orbital rotation around the local Y-axis of the zone
      let rotX = fileNode.localX * cos - fileNode.localZ * sin;
      let rotZ = fileNode.localX * sin + fileNode.localZ * cos;

      // Micro-neuron kinetic acceleration surge during activation
      const surged = this.applyOrbitalSurge(fileNode, rotX, rotZ);
      rotX = surged.rotX;
      rotZ = surged.rotZ;

      const worldX = fileNode.zonePos.x + rotX;
      const worldY = fileNode.zonePos.y + fileNode.localY;
      const worldZ = fileNode.zonePos.z + rotZ;

      fileNode.worldPos.set(worldX, worldY, worldZ);

      const scale = this.applyExcitationColors(fileNode, now, heatmap);
      if (this._colorsChanged) {
        needsColorUpdate = true;
        this._colorsChanged = false;
      }
      if (this.updateDendriteColors(fileNode, dendriteColArray)) {
        needsDendriteColorUpdate = true;
      }

      dummy.position.set(worldX, worldY, worldZ);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      fileInstancedMesh.setMatrixAt(i, dummy.matrix);

      // Update dendrite line Point 1 (file end)
      const pIdx = i * 6;
      dendritePosArray[pIdx] = worldX;
      dendritePosArray[pIdx + 1] = worldY;
      dendritePosArray[pIdx + 2] = worldZ;
    }

    fileInstancedMesh.instanceMatrix.needsUpdate = true;
    posAttr.needsUpdate = true;
    if (needsColorUpdate) {
      fileInstancedMesh.instanceColor.needsUpdate = true;
    }
    if (needsDendriteColorUpdate && colAttr) {
      colAttr.needsUpdate = true;
    }
  }

  applyOrbitalSurge(fileNode, rotX, rotZ) {
    if (fileNode.orbitalSurge <= 0) return { rotX, rotZ };

    fileNode.orbitalSurge = Math.max(0, fileNode.orbitalSurge - 0.007);
    const surgeAngle = Math.sin((1.0 - fileNode.orbitalSurge) * Math.PI) * 0.45;
    const surgeCos = Math.cos(surgeAngle);
    const surgeSin = Math.sin(surgeAngle);
    return {
      rotX: rotX * surgeCos - rotZ * surgeSin,
      rotZ: rotX * surgeSin + rotZ * surgeCos,
    };
  }

  // Excitation colors (10.0s spike) then heatmap gradient; returns current scale.
  applyExcitationColors(fileNode, now, heatmap) {
    const elapsed = fileNode.lastSpikeTime > 0 ? now - fileNode.lastSpikeTime : Infinity;

    if (elapsed < EXCITATION_DURATION_MS) {
      const progress = elapsed / EXCITATION_DURATION_MS; // 0.0 to 1.0 over exactly 10 seconds
      fileNode.excitation = 1.0 - progress;
      this.applySpikeColors(fileNode, progress);
      this._colorsChanged = true;
      return 1.0;
    }

    // Check Synaptic Heatmap
    const fileHeat = heatmap.fileHeatMap.get(fileNode.path) || 0;
    if (heatmap.heatmapMode || fileHeat > 0) {
      const heatProg = Math.min(3.0, fileHeat);
      fileNode.wasHeatMapped = true;
      this._colorsChanged = true;
      this.applyHeatGradient(fileNode, heatmap, fileHeat, heatProg);
      return heatProg > 1.0 ? 1.0 + (heatProg - 1.0) * 0.4 : 1.0;
    }

    if (fileNode.wasHeatMapped || fileNode.excitation > 0) {
      fileNode.excitation = 0;
      fileNode.wasHeatMapped = false;
      this.fileNeuronSystem.fileInstancedMesh.setColorAt(fileNode.index, fileNode.baseColor);
      this._colorsChanged = true;
    }
    return 1.0;
  }

  applySpikeColors(fileNode, progress) {
    const instancedMesh = this.fileNeuronSystem.fileInstancedMesh;

    // Radiant Cyber Red & Vivid Crimson
    const cyberRed = new THREE.Color(0xff2244);
    const brightRed = new THREE.Color(0xef4444);

    if (progress < 0.12) {
      // Stage 1: Quick energetic flash with white-hot cyber red core, fixed 1.0x scale
      const inProg = progress / 0.12;
      const curColor = cyberRed.clone().lerp(new THREE.Color(0xffffff), (1.0 - inProg) * 0.75);
      instancedMesh.setColorAt(fileNode.index, curColor);
    } else if (progress < 0.75) {
      // Stage 2: Sustained glowing cyber red at 1.0x scale
      instancedMesh.setColorAt(fileNode.index, brightRed);
    } else {
      // Stage 3: Smooth energy dissipation from cyber red back to baseColor, fixed 1.0x scale
      const exitRatio = (1.0 - progress) / 0.25; // 1 down to 0
      const curColor = fileNode.baseColor.clone().lerp(cyberRed, exitRatio);
      instancedMesh.setColorAt(fileNode.index, curColor);
    }
  }

  applyHeatGradient(fileNode, heatmap, fileHeat, heatProg) {
    const instancedMesh = this.fileNeuronSystem.fileInstancedMesh;
    if (heatmap.heatmapMode && fileHeat <= 0.05) {
      // Dormant node in heatmap view
      instancedMesh.setColorAt(fileNode.index, new THREE.Color(0x1e293b));
      return;
    }

    // Thermodynamic heat gradient: baseColor -> magenta (1.0) -> gold (2.0) -> white plasma (3.0)
    let heatCol = fileNode.baseColor.clone();
    if (heatProg <= 1.0) {
      heatCol.lerp(new THREE.Color(0xd946ef), heatProg);
    } else if (heatProg <= 2.0) {
      heatCol = new THREE.Color(0xd946ef).lerp(new THREE.Color(0xfbbf24), heatProg - 1.0);
    } else {
      heatCol = new THREE.Color(0xfbbf24).lerp(new THREE.Color(0xffffff), heatProg - 2.0);
    }
    instancedMesh.setColorAt(fileNode.index, heatCol);
  }

  // High-voltage dendrite surge in cyber red; returns true when buffer changed.
  updateDendriteColors(fileNode, dendriteColArray) {
    if (!dendriteColArray) return false;
    const pIdx = fileNode.index * 6;

    if (fileNode.excitation > 0) {
      const surge = fileNode.excitation;
      // File end: vibrant radiant red (R:1.0, G:0.13, B:0.27)
      dendriteColArray[pIdx] = THREE.MathUtils.lerp(fileNode.baseColor.r * 0.8, 1.0, surge);
      dendriteColArray[pIdx + 1] = THREE.MathUtils.lerp(fileNode.baseColor.g * 0.8, 0.13, surge);
      dendriteColArray[pIdx + 2] = THREE.MathUtils.lerp(fileNode.baseColor.b * 0.8, 0.27, surge);
      // Zone center end: deep crimson red (R:0.85, G:0.08, B:0.18)
      dendriteColArray[pIdx + 3] = THREE.MathUtils.lerp(fileNode.baseColor.r * 0.25, 0.85, surge);
      dendriteColArray[pIdx + 4] = THREE.MathUtils.lerp(fileNode.baseColor.g * 0.25, 0.08, surge);
      dendriteColArray[pIdx + 5] = THREE.MathUtils.lerp(fileNode.baseColor.b * 0.25, 0.18, surge);
      fileNode.wasDendriteSurging = true;
      return true;
    }

    if (fileNode.wasDendriteSurging) {
      dendriteColArray[pIdx] = fileNode.baseColor.r * 0.8;
      dendriteColArray[pIdx + 1] = fileNode.baseColor.g * 0.8;
      dendriteColArray[pIdx + 2] = fileNode.baseColor.b * 0.8;
      dendriteColArray[pIdx + 3] = fileNode.baseColor.r * 0.25;
      dendriteColArray[pIdx + 4] = fileNode.baseColor.g * 0.25;
      dendriteColArray[pIdx + 5] = fileNode.baseColor.b * 0.25;
      fileNode.wasDendriteSurging = false;
      return true;
    }

    return false;
  }
}
