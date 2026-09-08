import * as THREE from "three";
import { ZONE_POSITIONS, COLOR_MAP } from "../../topology-layout.js";
import { createLabelSprite } from "../shared/canvasSprite.js";

/**
 * Builds and owns the 23 zone macro-neuron meshes (glowing nucleus core,
 * crystalline lattice exoskeleton, dual gyroscopic rings, point light, label)
 * plus the organic layer-cluster tendrils connecting intra-layer nodes.
 */
export class ZoneNodeSystem {
  constructor(scene) {
    this.scene = scene;
    this.nodeMeshes = new Map(); // zoneId -> node record
    this.layerTendrils = [];
  }

  /** Builds every zone macro-node group from topology zone descriptors. */
  buildNodes(zones) {
    for (const zone of zones) {
      const pos = ZONE_POSITIONS[zone.id] || { x: 0, y: 0, z: 0, radius: 3.5, label: zone.name, layer: "core" };
      const group = this.createZoneGroup(zone, pos);
      this.scene.add(group);
      this.nodeMeshes.set(zone.id, {
        group,
        coreMesh: group.userData.coreMesh,
        latticeMesh: group.userData.latticeMesh,
        gyroRing1: group.userData.gyroRing1,
        gyroRing2: group.userData.gyroRing2,
        pointLight: group.userData.pointLight,
        labelSprite: group.userData.labelSprite,
        baseRadius: pos.radius,
        baseColor: group.userData.baseColor,
        zone,
        layer: pos.layer,
        spinSpeed: 0.01,
        excitation: 0.0,
        lastSpikeTime: 0,
        lastFileName: null,
        lastEventType: null,
      });
    }
  }

  createZoneGroup(zone, pos) {
    const group = new THREE.Group();
    group.position.set(pos.x, pos.y, pos.z);

    const isCoreHub = zone.id === "shared-contracts";
    const baseColor = isCoreHub ? COLOR_MAP.high_risk_hub : COLOR_MAP.idle;

    // Layer 1: Inner Glowing Metallic Nucleus Core
    const coreGeo = new THREE.SphereGeometry(pos.radius, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.18,
      metalness: 0.85,
      emissive: baseColor,
      emissiveIntensity: 0.65,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.userData = { zoneId: zone.id };
    group.add(coreMesh);

    // Layer 2: Faceted Crystalline Lattice Exoskeleton
    const latticeGeo = new THREE.IcosahedronGeometry(pos.radius * 1.32, 1);
    const latticeMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      roughness: 0.3,
    });
    const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
    group.add(latticeMesh);

    // Layer 3: Dual Gyroscopic Orbital Rings (Atomic / Quantum Reactor aesthetic)
    const ring1Geo = new THREE.TorusGeometry(pos.radius * 1.62, pos.radius * 0.042, 12, 48);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 0.45 });
    const gyroRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
    gyroRing1.rotation.x = Math.PI / 3;
    group.add(gyroRing1);

    const ring2Geo = new THREE.TorusGeometry(pos.radius * 1.88, pos.radius * 0.035, 12, 48);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 0.35 });
    const gyroRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
    gyroRing2.rotation.y = Math.PI / 4;
    group.add(gyroRing2);

    // Dynamic Local PointLight for core and active radiance
    const pointLight = new THREE.PointLight(baseColor, isCoreHub ? 1.4 : 0.6, pos.radius * 7);
    group.add(pointLight);

    // 3D Billboard Sprite Label
    const labelSprite = createLabelSprite(pos.label || zone.name || zone.id);
    labelSprite.position.set(0, pos.radius + 4.8, 0);
    group.add(labelSprite);

    group.userData = { coreMesh, latticeMesh, gyroRing1, gyroRing2, pointLight, labelSprite, baseColor };
    return group;
  }

  /**
   * Builds organic layer-cluster tendrils so every node stays connected.
   * @param {Set<string>} existingPairs Already connected zone-id pair keys.
   */
  buildLayerTendrils(existingPairs) {
    const clusters = {};
    for (const [id, pos] of Object.entries(ZONE_POSITIONS)) {
      clusters[pos.layer] = clusters[pos.layer] || [];
      clusters[pos.layer].push(id);
    }

    // Connect nodes in each cluster sequentially
    for (const nodeIds of Object.values(clusters)) {
      if (nodeIds.length > 1) {
        for (let i = 0; i < nodeIds.length - 1; i++) {
          const a = nodeIds[i];
          const b = nodeIds[i + 1];
          if (existingPairs.has(`${a}->${b}`)) continue;
          this.createTendril(a, b);
        }
      }
    }

    // Anchor agent-coordination (Apex) to project-configuration and server-core
    this.createTendril("agent-coordination", "project-configuration");
    this.createTendril("agent-coordination", "server-core");
  }

  createTendril(srcId, tgtId) {
    const srcPos = ZONE_POSITIONS[srcId];
    const tgtPos = ZONE_POSITIONS[tgtId];
    if (!srcPos || !tgtPos) return;

    const p1 = new THREE.Vector3(srcPos.x, srcPos.y, srcPos.z);
    const p2 = new THREE.Vector3(tgtPos.x, tgtPos.y, tgtPos.z);
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const cp = mid.add(new THREE.Vector3(0, 4, 0));

    const curve = new THREE.QuadraticBezierCurve3(p1, cp, p2);
    const points = curve.getPoints(24);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.1,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.layerTendrils.push(line);
  }

  /** Returns the list of zone core meshes for raycast hit-testing. */
  getCoreMeshes() {
    return Array.from(this.nodeMeshes.values()).map((n) => n.coreMesh);
  }
}
