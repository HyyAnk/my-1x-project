import * as THREE from "three";
import { ZONE_POSITIONS, COLOR_MAP } from "../../topology-layout.js";

/**
 * Builds and owns the file micro-neuron galaxy: one InstancedMesh of ~1,100
 * spheres orbiting their zone centers, plus a single-draw-call dendrite
 * LineSegments mesh connecting every file to its zone center.
 */
export class FileNeuronSystem {
  constructor(scene) {
    this.scene = scene;
    this.fileNodes = new Map(); // path -> fileNode
    this.fileNodesByIndex = []; // index -> fileNode
    this.fileNodesByZone = new Map(); // zoneId -> array of fileNodes
    this.zoneOrbitalData = new Map(); // zoneId -> { speed, phase }
    this.fileInstancedMesh = null;
    this.dendriteLineSegments = null;
  }

  /** Replaces the whole micro-neuron galaxy with a fresh file list. */
  build(files) {
    if (!files || files.length === 0) return;

    this.disposePrevious();

    // Group files by zone
    const filesByZone = new Map();
    for (const f of files) {
      if (!filesByZone.has(f.zoneId)) filesByZone.set(f.zoneId, []);
      filesByZone.get(f.zoneId).push(f);
    }

    const totalFiles = files.length;
    // Scaled down to 30% of original 0.38 radius for delicate, non-crowded particle points
    const sphereGeo = new THREE.SphereGeometry(0.114, 8, 6);
    const sphereMat = new THREE.MeshStandardMaterial({
      roughness: 0.25,
      metalness: 0.65,
      emissive: 0xffffff,
      emissiveIntensity: 0.45,
    });

    this.fileInstancedMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, totalFiles);
    this.fileInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.fileInstancedMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(totalFiles * 3), 3);

    // Buffers for dendrite filaments (single draw call)
    const dendritePositions = new Float32Array(totalFiles * 2 * 3);
    const dendriteColors = new Float32Array(totalFiles * 2 * 3);

    this.fillInstances(filesByZone, dendritePositions, dendriteColors);
    this.buildDendrites(dendritePositions, dendriteColors);
  }

  disposePrevious() {
    if (this.fileInstancedMesh) {
      this.scene.remove(this.fileInstancedMesh);
      this.fileInstancedMesh.geometry.dispose();
      this.fileInstancedMesh.material.dispose();
      this.fileInstancedMesh = null;
    }
    if (this.dendriteLineSegments) {
      this.scene.remove(this.dendriteLineSegments);
      this.dendriteLineSegments.geometry.dispose();
      this.dendriteLineSegments.material.dispose();
      this.dendriteLineSegments = null;
    }

    this.fileNodes.clear();
    this.fileNodesByIndex = [];
    this.fileNodesByZone.clear();
  }

  fillInstances(filesByZone, dendritePositions, dendriteColors) {
    const dummy = new THREE.Object3D();
    const goldenAngle = Math.PI * (3.0 - Math.sqrt(5.0)); // ~2.39996 rad
    let globalIdx = 0;

    for (const [zoneId, zoneFiles] of filesByZone.entries()) {
      const zonePos = ZONE_POSITIONS[zoneId] || { x: 0, y: 0, z: 0, radius: 4 };
      const zoneColorHex = COLOR_MAP[zoneId] || 0x00f0ff;
      const zoneColor = new THREE.Color(zoneColorHex);
      const N = zoneFiles.length;

      this.registerZoneOrbit(zoneId);

      const rMin = (zonePos.radius || 4) + 2.5;
      const rMax = (zonePos.radius || 4) + Math.min(22, 6.0 + Math.sqrt(N) * 2.2);

      globalIdx = this.fillZoneInstances(
        zoneId,
        zoneFiles,
        zonePos,
        zoneColor,
        { rMin, rMax, goldenAngle, dummy },
        globalIdx,
        dendritePositions,
        dendriteColors,
      );
    }

    this.fileInstancedMesh.instanceMatrix.needsUpdate = true;
    this.fileInstancedMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.fileInstancedMesh);
  }

  // Assign unique, serene orbital velocity and phase for this zone cluster
  registerZoneOrbit(zoneId) {
    const speedSeed = zoneId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const orbitalSpeed = 0.08 + (speedSeed % 7) * 0.015;
    const direction = speedSeed % 2 === 0 ? 1 : -1;
    this.zoneOrbitalData.set(zoneId, {
      speed: orbitalSpeed * direction,
      phase: (speedSeed * 0.13) % (Math.PI * 2),
    });
  }

  fillZoneInstances(zoneId, zoneFiles, zonePos, zoneColor, bounds, globalIdx, dendritePositions, dendriteColors) {
    const N = zoneFiles.length;
    for (let i = 0; i < N; i++) {
      const file = zoneFiles[i];
      const normIdx = (i + 0.5) / N;
      const radius = bounds.rMin + (bounds.rMax - bounds.rMin) * Math.sqrt(normIdx);
      const theta = i * bounds.goldenAngle;
      const v = 1.0 - 2.0 * normIdx; // from 1 down to -1

      // Slightly flattened ellipsoid for galactic disk aesthetic
      const yRel = v * radius * 0.65;
      const rXY = Math.sqrt(Math.max(0, radius * radius - yRel * yRel));
      const xRel = rXY * Math.cos(theta);
      const zRel = rXY * Math.sin(theta);

      const worldX = zonePos.x + xRel;
      const worldY = zonePos.y + yRel;
      const worldZ = zonePos.z + zRel;

      const dummy = bounds.dummy;
      dummy.position.set(worldX, worldY, worldZ);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      this.fileInstancedMesh.setMatrixAt(globalIdx, dummy.matrix);
      this.fileInstancedMesh.setColorAt(globalIdx, zoneColor);

      this.writeDendriteSegment(globalIdx, worldX, worldY, worldZ, zonePos, zoneColor, dendritePositions, dendriteColors);
      this.registerFileNode(file, zoneId, globalIdx, xRel, yRel, zRel, worldX, worldY, worldZ, zonePos, zoneColor);
      globalIdx++;
    }
    return globalIdx;
  }

  // Record dendrite segment from file to zone center
  writeDendriteSegment(globalIdx, worldX, worldY, worldZ, zonePos, zoneColor, dendritePositions, dendriteColors) {
    const pIdx = globalIdx * 6;
    dendritePositions[pIdx] = worldX;
    dendritePositions[pIdx + 1] = worldY;
    dendritePositions[pIdx + 2] = worldZ;
    dendritePositions[pIdx + 3] = zonePos.x;
    dendritePositions[pIdx + 4] = zonePos.y;
    dendritePositions[pIdx + 5] = zonePos.z;

    dendriteColors[pIdx] = zoneColor.r * 0.8;
    dendriteColors[pIdx + 1] = zoneColor.g * 0.8;
    dendriteColors[pIdx + 2] = zoneColor.b * 0.8;
    dendriteColors[pIdx + 3] = zoneColor.r * 0.25;
    dendriteColors[pIdx + 4] = zoneColor.g * 0.25;
    dendriteColors[pIdx + 5] = zoneColor.b * 0.25;
  }

  registerFileNode(file, zoneId, globalIdx, xRel, yRel, zRel, worldX, worldY, worldZ, zonePos, zoneColor) {
    const fileNode = {
      path: file.path,
      name: file.name,
      zoneId,
      index: globalIdx,
      localX: xRel,
      localY: yRel,
      localZ: zRel,
      worldPos: new THREE.Vector3(worldX, worldY, worldZ),
      zonePos: new THREE.Vector3(zonePos.x, zonePos.y, zonePos.z),
      baseColor: zoneColor.clone(),
      excitation: 0.0,
      eventType: "change",
      orbitalSurge: 0.0,
      dendriteSurge: 0.0,
    };

    this.fileNodes.set(file.path, fileNode);
    this.fileNodesByIndex[globalIdx] = fileNode;
    if (!this.fileNodesByZone.has(zoneId)) {
      this.fileNodesByZone.set(zoneId, []);
    }
    this.fileNodesByZone.get(zoneId).push(fileNode);
  }

  buildDendrites(dendritePositions, dendriteColors) {
    const dendriteGeo = new THREE.BufferGeometry();
    dendriteGeo.setAttribute("position", new THREE.BufferAttribute(dendritePositions, 3));
    dendriteGeo.setAttribute("color", new THREE.BufferAttribute(dendriteColors, 3));
    const dendriteMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dendriteLineSegments = new THREE.LineSegments(dendriteGeo, dendriteMat);
    this.scene.add(this.dendriteLineSegments);
  }

  /** Finds the first micro-neuron matching a bare file name (fallback lookup). */
  findFileNodeByName(fileName) {
    if (!fileName) return null;
    for (const node of this.fileNodes.values()) {
      if (node.name === fileName) return node;
    }
    return null;
  }
}
