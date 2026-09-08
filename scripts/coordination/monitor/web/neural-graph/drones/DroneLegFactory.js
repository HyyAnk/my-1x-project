import * as THREE from "three";

// Perfect bilateral symmetry: 3 right legs + 3 exact left mirrors across YZ plane
const LEG_CONFIGS = [
  // Right side (3 legs: Front, Mid, Rear)
  {
    id: "right-front",
    side: "right",
    anchor: { x: 0.82, y: -0.16, z: 0.48 },
    dir: new THREE.Vector3(0.82, 0.05, 0.48).normalize(),
    shoulderPitch: 0.28,
    kneeBend: -0.72,
  },
  {
    id: "right-mid",
    side: "right",
    anchor: { x: 0.94, y: -0.18, z: 0.0 },
    dir: new THREE.Vector3(0.94, 0.05, 0.0).normalize(),
    shoulderPitch: 0.3,
    kneeBend: -0.76,
  },
  {
    id: "right-rear",
    side: "right",
    anchor: { x: 0.82, y: -0.16, z: -0.48 },
    dir: new THREE.Vector3(0.82, 0.05, -0.48).normalize(),
    shoulderPitch: 0.28,
    kneeBend: -0.72,
  },
  // Left side (3 legs: Front, Mid, Rear - EXACT MIRROR ACROSS YZ PLANE)
  {
    id: "left-front",
    side: "left",
    anchor: { x: -0.82, y: -0.16, z: 0.48 },
    dir: new THREE.Vector3(-0.82, 0.05, 0.48).normalize(),
    shoulderPitch: 0.28,
    kneeBend: -0.72,
  },
  {
    id: "left-mid",
    side: "left",
    anchor: { x: -0.94, y: -0.18, z: 0.0 },
    dir: new THREE.Vector3(-0.94, 0.05, 0.0).normalize(),
    shoulderPitch: 0.3,
    kneeBend: -0.76,
  },
  {
    id: "left-rear",
    side: "left",
    anchor: { x: -0.82, y: -0.16, z: -0.48 },
    dir: new THREE.Vector3(-0.82, 0.05, -0.48).normalize(),
    shoulderPitch: 0.28,
    kneeBend: -0.72,
  },
];

/**
 * Builds one articulated mechanical leg per config: shoulder socket, upper
 * bone, elbow joint, forearm, wrist, dual-prong claw with laser muzzle, plus a
 * pre-allocated pool of 6 green plasma projectile bullets and impact flares.
 */
export function buildLeg(cfg, modelGroup, scene, mats) {
  const { whiteHullMat, darkMetalMat, blueAccentMat, laserMuzzleMat, droneMeshes, accentTrimMeshes } = mats;
  const isLeft = cfg.side === "left";

  const legRootGroup = new THREE.Group();
  legRootGroup.position.set(cfg.anchor.x, cfg.anchor.y, cfg.anchor.z);
  // Align local +X axis with the outward radial spread direction vector
  legRootGroup.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), cfg.dir);
  modelGroup.add(legRootGroup);

  // 1. Shoulder Socket Mount on Sphere
  const socketGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.18, 16);
  socketGeo.rotateZ(Math.PI / 2);
  const socketMesh = new THREE.Mesh(socketGeo, whiteHullMat);
  socketMesh.position.set(0.08, 0, 0);
  legRootGroup.add(socketMesh);
  droneMeshes.push(socketMesh);

  const socketRingGeo = new THREE.TorusGeometry(0.24, 0.035, 12, 24);
  socketRingGeo.rotateY(Math.PI / 2);
  const socketRingMesh = new THREE.Mesh(socketRingGeo, blueAccentMat);
  socketRingMesh.position.set(0.15, 0, 0);
  legRootGroup.add(socketRingMesh);
  droneMeshes.push(socketRingMesh);
  accentTrimMeshes.push(socketRingMesh);

  // 2. Proximal Limb Segment (Thigh / Upper Arm - Arches Upward & Outward)
  const upperBoneGroup = new THREE.Group();
  upperBoneGroup.position.set(0.18, 0, 0);
  upperBoneGroup.rotation.z = cfg.shoulderPitch;
  legRootGroup.add(upperBoneGroup);

  const upperBoneGeo = new THREE.CylinderGeometry(0.13, 0.17, 0.65, 16);
  upperBoneGeo.rotateZ(Math.PI / 2);
  const upperBoneMesh = new THREE.Mesh(upperBoneGeo, whiteHullMat);
  upperBoneMesh.position.set(0.32, 0, 0);
  upperBoneGroup.add(upperBoneMesh);
  droneMeshes.push(upperBoneMesh);

  // 3. Elbow / Knee Joint (Apex of the Leg Arch)
  const elbowGroup = new THREE.Group();
  elbowGroup.position.set(0.65, 0, 0);
  upperBoneGroup.add(elbowGroup);

  const elbowPivotGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.2, 14);
  elbowPivotGeo.rotateX(Math.PI / 2);
  const elbowPivotMesh = new THREE.Mesh(elbowPivotGeo, darkMetalMat);
  elbowGroup.add(elbowPivotMesh);
  droneMeshes.push(elbowPivotMesh);

  const elbowRingGeo = new THREE.TorusGeometry(0.13, 0.028, 12, 20);
  const elbowRingMesh = new THREE.Mesh(elbowRingGeo, blueAccentMat);
  elbowRingMesh.position.set(0, 0, 0.1);
  elbowGroup.add(elbowRingMesh);
  droneMeshes.push(elbowRingMesh);
  accentTrimMeshes.push(elbowRingMesh);

  // 4. Distal Limb Segment (Forearm / Lower Shin - Arches Downward & Forward)
  const forearmGroup = new THREE.Group();
  forearmGroup.rotation.z = cfg.kneeBend;
  elbowGroup.add(forearmGroup);

  const forearmGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.62, 16);
  forearmGeo.rotateZ(Math.PI / 2);
  const forearmMesh = new THREE.Mesh(forearmGeo, whiteHullMat);
  forearmMesh.position.set(0.31, 0, 0);
  forearmGroup.add(forearmMesh);
  droneMeshes.push(forearmMesh);

  // 5. Wrist Joint
  const wristGroup = new THREE.Group();
  wristGroup.position.set(0.62, 0, 0);
  forearmGroup.add(wristGroup);

  const wristPivotGeo = new THREE.SphereGeometry(0.1, 12, 12);
  const wristPivotMesh = new THREE.Mesh(wristPivotGeo, darkMetalMat);
  wristGroup.add(wristPivotMesh);
  droneMeshes.push(wristPivotMesh);

  const wristRingGeo = new THREE.TorusGeometry(0.11, 0.025, 12, 20);
  wristRingGeo.rotateY(Math.PI / 2);
  const wristRingMesh = new THREE.Mesh(wristRingGeo, blueAccentMat);
  wristGroup.add(wristRingMesh);
  droneMeshes.push(wristRingMesh);
  accentTrimMeshes.push(wristRingMesh);

  const claw = buildClaw(wristGroup, { whiteHullMat, darkMetalMat, laserMuzzleMat, droneMeshes });
  const emitterMarker = claw.emitterMarker;

  // 7. Pre-allocated Green Laser Plasma Projectile Bullet Pool (Strictly Green!)
  const bulletPool = [];
  for (let b = 0; b < 6; b++) {
    bulletPool.push(buildBullet(scene));
  }

  return {
    cfg,
    isLeft,
    legRootGroup,
    upperBoneGroup,
    elbowGroup,
    forearmGroup,
    wristGroup,
    clawGroup: claw.clawGroup,
    muzzleMesh: claw.muzzleMesh,
    emitterMarker,
    bulletPool,
    shoulderPitch: cfg.shoulderPitch,
    kneeBend: cfg.kneeBend,
    salvo: null,
  };
}

/** Exposes the full leg configuration table for the model factory. */
export function getLegConfigs() {
  return LEG_CONFIGS;
}

// Mechanical Claw / Pincer (Dual-prong Gripper with Laser Muzzle)
function buildClaw(wristGroup, mats) {
  const { whiteHullMat, darkMetalMat, laserMuzzleMat, droneMeshes } = mats;
  const clawGroup = new THREE.Group();
  wristGroup.add(clawGroup);

  // Upper Prong
  const jawArmGeo = new THREE.BoxGeometry(0.24, 0.065, 0.075);
  const upperJawArm = new THREE.Mesh(jawArmGeo, whiteHullMat);
  upperJawArm.position.set(0.13, 0.11, 0);
  upperJawArm.rotation.z = -0.32;
  clawGroup.add(upperJawArm);
  droneMeshes.push(upperJawArm);

  const jawTipGeo = new THREE.BoxGeometry(0.12, 0.06, 0.07);
  const upperJawTip = new THREE.Mesh(jawTipGeo, whiteHullMat);
  upperJawTip.position.set(0.25, 0.06, 0);
  upperJawTip.rotation.z = -0.85;
  clawGroup.add(upperJawTip);
  droneMeshes.push(upperJawTip);

  const jawPadGeo = new THREE.BoxGeometry(0.18, 0.022, 0.06);
  const upperJawPad = new THREE.Mesh(jawPadGeo, darkMetalMat);
  upperJawPad.position.set(0.13, 0.075, 0);
  upperJawPad.rotation.z = -0.32;
  clawGroup.add(upperJawPad);
  droneMeshes.push(upperJawPad);

  // Lower Prong
  const lowerJawArm = new THREE.Mesh(jawArmGeo, whiteHullMat);
  lowerJawArm.position.set(0.13, -0.11, 0);
  lowerJawArm.rotation.z = 0.32;
  clawGroup.add(lowerJawArm);
  droneMeshes.push(lowerJawArm);

  const lowerJawTip = new THREE.Mesh(jawTipGeo, whiteHullMat);
  lowerJawTip.position.set(0.25, -0.06, 0);
  lowerJawTip.rotation.z = 0.85;
  clawGroup.add(lowerJawTip);
  droneMeshes.push(lowerJawTip);

  const lowerJawPad = new THREE.Mesh(jawPadGeo, darkMetalMat);
  lowerJawPad.position.set(0.13, -0.075, 0);
  lowerJawPad.rotation.z = 0.32;
  clawGroup.add(lowerJawPad);
  droneMeshes.push(lowerJawPad);

  // Center Laser Emitter Muzzle (Strictly Cyber Green)
  const muzzleGeo = new THREE.CylinderGeometry(0.04, 0.058, 0.14, 12);
  muzzleGeo.rotateZ(Math.PI / 2);
  const muzzleMesh = new THREE.Mesh(muzzleGeo, laserMuzzleMat);
  muzzleMesh.position.set(0.08, 0, 0);
  clawGroup.add(muzzleMesh);
  droneMeshes.push(muzzleMesh);

  // Emitter tip marker for projectile bullet origin calculation
  const emitterMarker = new THREE.Object3D();
  emitterMarker.position.set(0.28, 0, 0);
  clawGroup.add(emitterMarker);

  return { clawGroup, muzzleMesh, emitterMarker };
}

// One green plasma projectile capsule + its contact impact flare
function buildBullet(scene) {
  const bulletGroup = new THREE.Group();
  bulletGroup.visible = false;

  // Outer cyber green plasma projectile capsule (Length increased 3x to 3.3)
  const bulletOuterGeo = new THREE.CylinderGeometry(0.14, 0.14, 3.3, 12);
  const bulletOuterMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88, // Vivid Cyber Green
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const bulletOuterMesh = new THREE.Mesh(bulletOuterGeo, bulletOuterMat);
  bulletGroup.add(bulletOuterMesh);

  // Inner neon green luminous core (Length increased 3x to 3.0, Strictly Green, NO white!)
  const bulletCoreGeo = new THREE.CylinderGeometry(0.07, 0.07, 3.0, 8);
  const bulletCoreMat = new THREE.MeshBasicMaterial({
    color: 0x39ff14, // Neon Lime Green
    transparent: true,
    opacity: 0.98,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const bulletCoreMesh = new THREE.Mesh(bulletCoreGeo, bulletCoreMat);
  bulletGroup.add(bulletCoreMesh);

  scene.add(bulletGroup);

  // Cyber green plasma contact impact flare at target micro-neuron (Radius reduced to 20%: 0.05 to 0.5)
  const impactGeo = new THREE.RingGeometry(0.05, 0.5, 20);
  const impactMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88, // Vivid Cyber Green
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const impactFlare = new THREE.Mesh(impactGeo, impactMat);
  impactFlare.visible = false;
  scene.add(impactFlare);

  return {
    bulletGroup,
    bulletOuterMesh,
    bulletCoreMesh,
    impactFlare,
  };
}
