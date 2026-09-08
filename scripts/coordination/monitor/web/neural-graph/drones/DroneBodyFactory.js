import * as THREE from "three";

/**
 * Builds the non-leg drone body parts: ceramic sphere hull, top cap, ocular
 * visor, anti-grav ring, charging plasma orb, and the colossal volumetric
 * mega-beam assembly. Materials are created per drone and themed by claim.
 */
export function buildDroneBody(modelGroup, coreGroup, droneTheme) {
  const droneMeshes = [];
  const accentTrimMeshes = [];

  // 1. High-grade porcelain white ceramic material (Pure white, high specular gloss)
  const whiteHullMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    specular: 0xffffff,
    shininess: 95,
    emissive: 0xffffff,
    emissiveIntensity: 0.32,
  });

  // Dark titanium/slate metallic joint and bezel material
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x141824,
    roughness: 0.35,
    metalness: 0.85,
  });

  // Vivid cyber accent rings (sockets, pivots, top cap) - themed
  const blueAccentMat = new THREE.MeshBasicMaterial({
    color: droneTheme.hex,
  });

  // Themed optical eye lens & LED glow ring
  const eyeRingMat = new THREE.MeshBasicMaterial({
    color: droneTheme.hex,
  });

  const pupilMat = new THREE.MeshBasicMaterial({
    color: droneTheme.hex,
  });

  const eyeHighlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  // Cyber green cannon muzzle emitter
  const laserMuzzleMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
  });

  // Central Sphere Body
  const sphereGeo = new THREE.SphereGeometry(1.0, 32, 28);
  const sphereMesh = new THREE.Mesh(sphereGeo, whiteHullMat);
  coreGroup.add(sphereMesh);
  droneMeshes.push(sphereMesh);

  // Top Cap Assembly
  const topCapGeo = new THREE.CylinderGeometry(0.24, 0.3, 0.08, 20);
  const topCapMesh = new THREE.Mesh(topCapGeo, whiteHullMat);
  topCapMesh.position.set(0, 0.98, 0);
  coreGroup.add(topCapMesh);
  droneMeshes.push(topCapMesh);

  const topRingGeo = new THREE.TorusGeometry(0.26, 0.03, 16, 24);
  topRingGeo.rotateX(Math.PI / 2);
  const topRingMesh = new THREE.Mesh(topRingGeo, blueAccentMat);
  topRingMesh.position.set(0, 1.01, 0);
  coreGroup.add(topRingMesh);
  droneMeshes.push(topRingMesh);
  accentTrimMeshes.push(topRingMesh);

  const eye = buildEyeAssembly(coreGroup, {
    darkMetalMat,
    eyeRingMat,
    pupilMat,
    eyeHighlightMat,
    droneMeshes,
    accentTrimMeshes,
  });

  const antiGravGlow = buildAntiGravRing(coreGroup, eyeRingMat, droneMeshes);

  const chargingOrb = buildChargingOrb(modelGroup, droneTheme);

  const megaBeam = buildMegaBeam(droneTheme);

  return {
    droneMeshes,
    accentTrimMeshes,
    eye,
    antiGravGlow,
    chargingOrb,
    megaBeam,
    mats: { whiteHullMat, darkMetalMat, blueAccentMat, eyeRingMat, pupilMat, eyeHighlightMat, laserMuzzleMat },
  };
}

// Front Ocular Visor / Eye Assembly (At +Z face)
function buildEyeAssembly(coreGroup, mats) {
  const eyeGroup = new THREE.Group();
  eyeGroup.position.set(0, 0.05, 0.85);
  coreGroup.add(eyeGroup);

  // Dark recessed bevel cavity
  const bezelGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.22, 32);
  bezelGeo.rotateX(Math.PI / 2);
  const bezelMesh = new THREE.Mesh(bezelGeo, mats.darkMetalMat);
  eyeGroup.add(bezelMesh);
  mats.droneMeshes.push(bezelMesh);

  // Outer glowing cyan ring
  const eyeRingGeo = new THREE.TorusGeometry(0.52, 0.042, 16, 36);
  const eyeRingMesh = new THREE.Mesh(eyeRingGeo, mats.eyeRingMat);
  eyeRingMesh.position.set(0, 0, 0.1);
  eyeGroup.add(eyeRingMesh);
  mats.droneMeshes.push(eyeRingMesh);
  mats.accentTrimMeshes.push(eyeRingMesh);

  // Luminous cyan pupil core
  const pupilGeo = new THREE.SphereGeometry(0.36, 24, 20);
  const pupilMesh = new THREE.Mesh(pupilGeo, mats.pupilMat);
  pupilMesh.scale.set(1.0, 1.0, 0.3);
  pupilMesh.position.set(0, 0, 0.1);
  eyeGroup.add(pupilMesh);
  mats.droneMeshes.push(pupilMesh);

  // Stylized ocular reflection highlights (Crescent + dot in upper-left)
  const highlightGeo1 = new THREE.BoxGeometry(0.12, 0.065, 0.02);
  const highlight1 = new THREE.Mesh(highlightGeo1, mats.eyeHighlightMat);
  highlight1.position.set(-0.13, 0.14, 0.18);
  highlight1.rotation.z = -0.35;
  eyeGroup.add(highlight1);
  mats.droneMeshes.push(highlight1);

  const highlightGeo2 = new THREE.SphereGeometry(0.028, 8, 8);
  const highlight2 = new THREE.Mesh(highlightGeo2, mats.eyeHighlightMat);
  highlight2.position.set(-0.18, 0.05, 0.18);
  eyeGroup.add(highlight2);
  mats.droneMeshes.push(highlight2);

  // Dedicated Pure White Local Fill Light on Sentinel Core
  const coreFillLight = new THREE.PointLight(0xffffff, 2.4, 20);
  coreFillLight.position.set(0, 0.2, 1.2);
  eyeGroup.add(coreFillLight);

  return { eyeGroup, pupilMesh };
}

// Bottom anti-grav thruster / stabilization field
function buildAntiGravRing(coreGroup, eyeRingMat, droneMeshes) {
  const antiGravGeo = new THREE.TorusGeometry(0.36, 0.045, 16, 32);
  antiGravGeo.rotateX(Math.PI / 2);
  const antiGravGlow = new THREE.Mesh(antiGravGeo, eyeRingMat.clone());
  antiGravGlow.position.set(0, -0.98, 0);
  coreGroup.add(antiGravGlow);
  droneMeshes.push(antiGravGlow);
  return antiGravGlow;
}

// Charging Energy Plasma Orb (Synthesizes in front of eye for 2.0 seconds)
function buildChargingOrb(modelGroup, droneTheme) {
  const chargingOrbGroup = new THREE.Group();
  chargingOrbGroup.position.set(0, 0.05, 1.6);
  chargingOrbGroup.visible = false;
  modelGroup.add(chargingOrbGroup);

  // Inner bright white plasma core
  const orbCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
  });
  const orbCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 20), orbCoreMat);
  chargingOrbGroup.add(orbCoreMesh);

  // Outer themed plasma glow shell
  const orbShellMat = new THREE.MeshBasicMaterial({
    color: droneTheme.hex,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
  });
  const orbShellMesh = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 20), orbShellMat);
  chargingOrbGroup.add(orbShellMesh);

  // Dynamic accretion rings spinning around the charging sphere
  const ringMat1 = new THREE.MeshBasicMaterial({
    color: droneTheme.hex,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const accretionRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.04, 12, 32), ringMat1);
  accretionRing1.rotation.x = Math.PI / 3;
  chargingOrbGroup.add(accretionRing1);

  const ringMat2 = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const accretionRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.03, 12, 32), ringMat2);
  accretionRing2.rotation.y = Math.PI / 4;
  chargingOrbGroup.add(accretionRing2);

  return { chargingOrbGroup, orbCoreMesh, orbShellMesh, accretionRing1, accretionRing2 };
}

// Colossal Volumetric Mega-Beam (Concentric cylinders in world scene)
function buildMegaBeam(droneTheme) {
  const megaBeamGroup = new THREE.Group();
  megaBeamGroup.visible = false;

  // Outer plasma beam conduit (cylinder radius 0.65, height 1.0 along Y axis)
  const megaOuterMat = new THREE.MeshBasicMaterial({
    color: droneTheme.hex,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const megaOuterGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.0, 32, 1, true);
  megaOuterGeo.translate(0, 0.5, 0); // Origin at bottom of cylinder
  const megaOuterMesh = new THREE.Mesh(megaOuterGeo, megaOuterMat);
  megaBeamGroup.add(megaOuterMesh);

  // Inner hyper-focused core beam
  const megaCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const megaCoreGeo = new THREE.CylinderGeometry(0.26, 0.26, 1.0, 24, 1, true);
  megaCoreGeo.translate(0, 0.5, 0);
  const megaCoreMesh = new THREE.Mesh(megaCoreGeo, megaCoreMat);
  megaBeamGroup.add(megaCoreMesh);

  // Colossal impact flare shockwave at target sphere
  const megaFlareGeo = new THREE.RingGeometry(0.6, 5.5, 36);
  const megaFlareMat = new THREE.MeshBasicMaterial({
    color: droneTheme.hex,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const megaImpactFlare = new THREE.Mesh(megaFlareGeo, megaFlareMat);
  megaImpactFlare.visible = false;

  return { megaBeamGroup, megaOuterMat, megaCoreMat, megaImpactFlare };
}
