import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ZONE_POSITIONS, COLOR_MAP } from "./topology-layout.js";

export { ZONE_POSITIONS, COLOR_MAP };

export class NeuralGraph {
  constructor(containerElement, onNodeSelect) {
    this.container = containerElement;
    this.onNodeSelect = onNodeSelect || (() => {});
    this.nodeMeshes = new Map();
    this.axonLines = [];
    this.layerTendrils = [];
    this.coordinationState = null;
    this.hoveredZoneId = null;
    this.autoRotate = false;
    this.safeZoneMode = null;
    this.cameraAnimation = null;

    this.initScene();
    this.initLights();
    this.initStarfield();
    this.initControls();
    this.initEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070a13, 0.0032);

    const width = this.container.clientWidth || window.innerWidth || 800;
    const height = this.container.clientHeight || window.innerHeight || 600;

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.defaultCameraPos = new THREE.Vector3(0, 35, 175);
    this.camera.position.copy(this.defaultCameraPos);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x070a13, 1);
    this.container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-9999, -9999);
  }

  initLights() {
    const ambient = new THREE.AmbientLight(0x38bdf8, 0.65);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(120, 160, 100);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 0.6);
    dirLight2.position.set(-120, -60, -100);
    this.scene.add(dirLight2);
  }

  initStarfield() {
    // Minimal, elegant deep-space perimeter stars (clean & clutter-free)
    const starCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      // Position stars in a distant spherical shell far behind the neural graph
      const r = 400 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);

      // Deep celestial slate & muted cyan tint
      colors[i] = 0.25 + Math.random() * 0.2;
      colors[i + 1] = 0.45 + Math.random() * 0.25;
      colors[i + 2] = 0.7 + Math.random() * 0.2;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.85,
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 350;
    this.controls.minDistance = 25;
    this.controls.target.set(0, 5, 0);
  }

  initEvents() {
    window.addEventListener("resize", () => {
      if (!this.container) return;
      const width = this.container.clientWidth || window.innerWidth || 800;
      const height = this.container.clientHeight || window.innerHeight || 600;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });

    this.renderer.domElement.addEventListener("mousemove", (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    this.renderer.domElement.addEventListener("click", () => {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hitCandidates = Array.from(this.nodeMeshes.values()).map((n) => n.coreMesh);
      const intersects = this.raycaster.intersectObjects(hitCandidates);

      if (intersects.length > 0) {
        const hitZoneId = intersects[0].object.userData.zoneId;
        const zoneData = this.coordinationState?.zones?.find((z) => z.id === hitZoneId);
        if (zoneData) {
          this.onNodeSelect(zoneData);
        }
      }
    });
  }

  loadTopology(topology) {
    // 1. Build Multi-Layer 3D Neuron Somata
    for (const zone of topology.zones) {
      const pos = ZONE_POSITIONS[zone.id] || { x: 0, y: 0, z: 0, radius: 3.5, label: zone.name, layer: "core" };
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

      // Layer 4: Expanding Concentric Energy Shockwave Rings (Active Radiation Waves)
      const shockGeo = new THREE.RingGeometry(pos.radius * 1.1, pos.radius * 1.28, 32);
      const shockMat1 = new THREE.MeshBasicMaterial({
        color: COLOR_MAP.active,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const shockRing1 = new THREE.Mesh(shockGeo, shockMat1);
      shockRing1.rotation.x = Math.PI / 2;
      shockRing1.visible = false;
      group.add(shockRing1);

      const shockMat2 = new THREE.MeshBasicMaterial({
        color: COLOR_MAP.active,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const shockRing2 = new THREE.Mesh(shockGeo, shockMat2);
      shockRing2.rotation.y = Math.PI / 2;
      shockRing2.visible = false;
      group.add(shockRing2);
      // Layer 5: Active Plasma Spark Fountain / Solar Flare Emitter (3D omni-directional spew)
      const sparkCount = 54;
      const sparkGeo = new THREE.BufferGeometry();
      const sparkPositions = new Float32Array(sparkCount * 3);
      const sparkColors = new Float32Array(sparkCount * 3);
      const sparkData = [];

      for (let i = 0; i < sparkCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const sinPhi = Math.sin(phi);

        const dir = new THREE.Vector3(
          sinPhi * Math.cos(theta),
          sinPhi * Math.sin(theta),
          Math.cos(phi)
        ).normalize();

        const speed = 0.5 + Math.random() * 0.8;
        const maxDist = pos.radius * (2.6 + Math.random() * 2.6);
        const life = Math.random();

        sparkData.push({ dir, speed, maxDist, life });

        sparkPositions[i * 3] = 0;
        sparkPositions[i * 3 + 1] = 0;
        sparkPositions[i * 3 + 2] = 0;

        sparkColors[i * 3] = 1.0;
        sparkColors[i * 3 + 1] = 0.2;
        sparkColors[i * 3 + 2] = 0.5;
      }

      sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
      sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkColors, 3));

      const sparkMat = new THREE.PointsMaterial({
        size: 1.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const sparkEmitter = new THREE.Points(sparkGeo, sparkMat);
      sparkEmitter.visible = false;
      group.add(sparkEmitter);

      // Dynamic Local PointLight for core and active radiance
      const pointLight = new THREE.PointLight(baseColor, isCoreHub ? 1.4 : 0.6, pos.radius * 7);
      group.add(pointLight);

      // 3D Billboard Sprite Label
      const labelSprite = this.createLabelSprite(pos.label || zone.name || zone.id);
      labelSprite.position.set(0, pos.radius + 4.8, 0);
      group.add(labelSprite);

      this.scene.add(group);
      this.nodeMeshes.set(zone.id, {
        group,
        coreMesh,
        latticeMesh,
        gyroRing1,
        gyroRing2,
        shockRing1,
        shockRing2,
        sparkEmitter,
        sparkData,
        sparkCount,
        pointLight,
        labelSprite,
        baseRadius: pos.radius,
        baseColor,
        zone,
        layer: pos.layer,
        spinSpeed: 0.01,
      });
    }

    // 2. Build Synaptic Axons with Volumetric Optical Conduits & Streamlined Light Beams
    const existingPairs = new Set();
    for (const link of topology.links) {
      const srcPos = ZONE_POSITIONS[link.source];
      const tgtPos = ZONE_POSITIONS[link.target];
      if (!srcPos || !tgtPos) continue;

      existingPairs.add(`${link.source}->${link.target}`);
      existingPairs.add(`${link.target}->${link.source}`);

      const p1 = new THREE.Vector3(srcPos.x, srcPos.y, srcPos.z);
      const p2 = new THREE.Vector3(tgtPos.x, tgtPos.y, tgtPos.z);

      // Curved control point via elevated midpoint
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const normal = mid.clone().normalize().multiplyScalar(14);
      const cp = mid.add(normal);

      const curve = new THREE.QuadraticBezierCurve3(p1, cp, p2);

      // 2a. 3D Volumetric Optical Light Conduit (Tube)
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

      // 2b. Razor-fine core laser filament
      const points = curve.getPoints(36);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
      const curveMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.22,
      });
      const line = new THREE.Line(curveGeo, curveMat);
      this.scene.add(line);

      // 2c. Streamlined Photonic Light Beams (Laser Pulses)
      const packetCount = 2;
      const particles = [];
      for (let i = 0; i < packetCount; i++) {
        // Outer glowing beam capsule with additive neon halo
        const haloGeo = new THREE.CapsuleGeometry(0.46, 4.0, 6, 8);
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);

        // White-hot plasma core filament
        const coreGeo = new THREE.CapsuleGeometry(0.18, 3.6, 4, 8);
        const coreMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        haloMesh.add(coreMesh);

        this.scene.add(haloMesh);

        particles.push({
          mesh: haloMesh,
          coreMesh,
          progress: i / packetCount,
          speed: 0.0035 + Math.random() * 0.002,
        });
      }

      this.axonLines.push({
        source: link.source,
        target: link.target,
        conduit,
        line,
        curve,
        particles,
        phase: Math.random() * Math.PI * 2,
        isHovered: false,
        isActive: false,
      });
    }

    // 3. Build Organic Layer Cluster Tendrils (Connecting Intra-Layer Nodes)
    // Ensures zero disconnected nodes; unifies the brain into a cohesive network.
    const clusters = {};
    for (const [id, pos] of Object.entries(ZONE_POSITIONS)) {
      clusters[pos.layer] = clusters[pos.layer] || [];
      clusters[pos.layer].push(id);
    }

    // Connect nodes in each cluster sequentially
    for (const [layerName, nodeIds] of Object.entries(clusters)) {
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

  createLabelSprite(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");

    // Rounded background chip
    ctx.fillStyle = "rgba(7, 10, 19, 0.88)";
    ctx.strokeStyle = "rgba(0, 240, 255, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(8, 8, 368, 80, 16);
    } else {
      ctx.rect(8, 8, 368, 80);
    }
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.font = "bold 30px 'JetBrains Mono', monospace, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 192, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(16, 4, 1);
    return sprite;
  }

  updateState(state) {
    this.coordinationState = state;
    if (!state || !state.zones) return;

    if (this.safeZoneMode) {
      this.applySafeZoneHighlights();
      return;
    }

    const activeZoneIds = new Set(
      state.zones.filter((z) => z.status === "active").map((z) => z.id)
    );

    for (const zState of state.zones) {
      const node = this.nodeMeshes.get(zState.id);
      if (!node) continue;

      let color = COLOR_MAP.idle;
      let emissiveIntensity = 0.65;
      let spinSpeed = 0.01;

      if (zState.id === "shared-contracts" && zState.status === "idle") {
        color = COLOR_MAP.high_risk_hub;
        emissiveIntensity = 0.8;
      } else if (zState.status === "active") {
        color = COLOR_MAP.active;
        emissiveIntensity = 1.15;
        spinSpeed = 0.045; // Energetic gyroscope spin for active claimed nodes!
      } else if (zState.status === "read_stable") {
        color = COLOR_MAP.read_stable;
        emissiveIntensity = 0.85;
      }

      node.baseColor = color;
      node.spinSpeed = spinSpeed;
      node.coreMesh.material.color.setHex(color);
      node.coreMesh.material.emissive.setHex(color);
      node.coreMesh.material.emissiveIntensity = emissiveIntensity;
      node.coreMesh.material.transparent = false;
      node.coreMesh.material.opacity = 1.0;
      node.latticeMesh.material.color.setHex(color);
      node.latticeMesh.material.opacity = 0.35;
      node.gyroRing1.material.color.setHex(color);
      node.gyroRing2.material.color.setHex(color);
      node.pointLight.color.setHex(color);
      node.pointLight.intensity = zState.status === "active" ? 1.6 : 0.6;
      node.labelSprite.material.opacity = 1.0;
    }

    // Update axon impulses based on activity
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

      for (const p of axon.particles) {
        p.mesh.material.color.setHex(pColor);
        p.mesh.scale.set(pScale, pScale * 1.5, pScale);
        p.speed = pSpeed + Math.random() * 0.001;
      }
    }
  }

  highlightSafeZones(targetZoneId, safeZoneIds, conflictingZones) {
    const safeSet = new Set(safeZoneIds);
    this.safeZoneMode = { targetZoneId, safeSet, conflictingZones };
    this.applySafeZoneHighlights();
  }

  applySafeZoneHighlights() {
    if (!this.safeZoneMode) return;
    const { targetZoneId, safeSet } = this.safeZoneMode;

    for (const [id, node] of this.nodeMeshes) {
      if (id === targetZoneId) {
        // Target: bright amber glow
        node.coreMesh.material.color.setHex(0xf59e0b);
        node.coreMesh.material.emissive.setHex(0xf59e0b);
        node.coreMesh.material.emissiveIntensity = 1.3;
        node.coreMesh.material.transparent = false;
        node.coreMesh.material.opacity = 1.0;
        node.latticeMesh.material.color.setHex(0xf59e0b);
        node.latticeMesh.material.opacity = 0.8;
        node.gyroRing1.material.color.setHex(0xf59e0b);
        node.gyroRing2.material.color.setHex(0xf59e0b);
        node.labelSprite.material.opacity = 1.0;
      } else if (safeSet.has(id)) {
        // Safe disjoint zone: bright neon green
        node.coreMesh.material.color.setHex(0x10b981);
        node.coreMesh.material.emissive.setHex(0x10b981);
        node.coreMesh.material.emissiveIntensity = 1.0;
        node.coreMesh.material.transparent = false;
        node.coreMesh.material.opacity = 1.0;
        node.latticeMesh.material.color.setHex(0x10b981);
        node.latticeMesh.material.opacity = 0.65;
        node.gyroRing1.material.color.setHex(0x10b981);
        node.gyroRing2.material.color.setHex(0x10b981);
        node.labelSprite.material.opacity = 1.0;
      } else {
        // Conflicting zone: dimmed
        node.coreMesh.material.color.setHex(0x475569);
        node.coreMesh.material.emissive.setHex(0x1e293b);
        node.coreMesh.material.emissiveIntensity = 0.1;
        node.coreMesh.material.transparent = true;
        node.coreMesh.material.opacity = 0.2;
        node.latticeMesh.material.opacity = 0.05;
        node.gyroRing1.material.opacity = 0.05;
        node.gyroRing2.material.opacity = 0.05;
        node.labelSprite.material.opacity = 0.25;
      }
    }

    // Axons to safe zones highlighted in green
    for (const axon of this.axonLines) {
      const isTargetConn = axon.source === targetZoneId || axon.target === targetZoneId;
      const isSafeConn = safeSet.has(axon.source) || safeSet.has(axon.target);
      if (isTargetConn && isSafeConn) {
        axon.line.material.color.setHex(0x10b981);
        axon.line.material.opacity = 0.85;
        if (axon.conduit) {
          axon.conduit.material.color.setHex(0x10b981);
          axon.conduit.material.opacity = 0.65;
        }
        for (const p of axon.particles) {
          p.mesh.material.color.setHex(0x10b981);
          p.mesh.visible = true;
        }
      } else {
        axon.line.material.color.setHex(0x334155);
        axon.line.material.opacity = 0.06;
        if (axon.conduit) {
          axon.conduit.material.color.setHex(0x334155);
          axon.conduit.material.opacity = 0.02;
        }
        for (const p of axon.particles) {
          p.mesh.visible = false;
        }
      }
    }
  }

  clearSafeZoneHighlights() {
    this.safeZoneMode = null;
    for (const [_, node] of this.nodeMeshes) {
      node.coreMesh.material.transparent = false;
      node.coreMesh.material.opacity = 1.0;
      node.latticeMesh.material.opacity = 0.35;
      node.gyroRing1.material.opacity = 0.45;
      node.gyroRing2.material.opacity = 0.35;
      node.labelSprite.material.opacity = 1.0;
    }
    for (const axon of this.axonLines) {
      for (const p of axon.particles) {
        p.mesh.visible = true;
      }
    }
    this.updateState(this.coordinationState);
  }

  flyToNode(zoneId) {
    const pos = ZONE_POSITIONS[zoneId];
    if (!pos) return;
    this.cameraAnimation = {
      targetPos: new THREE.Vector3(pos.x, pos.y + 10, pos.z + 45),
      targetLookAt: new THREE.Vector3(pos.x, pos.y, pos.z),
    };
  }

  resetCamera() {
    this.controls.target.set(0, 5, 0);
    this.cameraAnimation = {
      targetPos: this.defaultCameraPos.clone(),
      targetLookAt: new THREE.Vector3(0, 5, 0),
    };
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 0.8;
  }

  animate(time) {
    requestAnimationFrame(this.animate);
    const t = time * 0.001;

    // Gentle deep space starfield drift
    if (this.starfield) {
      this.starfield.rotation.y += 0.00015;
    }

    // Smooth camera fly-to interpolation
    if (this.cameraAnimation) {
      this.camera.position.lerp(this.cameraAnimation.targetPos, 0.07);
      this.controls.target.lerp(this.cameraAnimation.targetLookAt, 0.07);
      if (this.camera.position.distanceTo(this.cameraAnimation.targetPos) < 0.2) {
        this.cameraAnimation = null;
      }
    }

    // Animate Multi-layer Neurons
    for (const [id, node] of this.nodeMeshes) {
      const zState = this.coordinationState?.zones?.find((z) => z.id === id);
      const isActive = zState?.status === "active";
      const isHub = id === "shared-contracts";
      const isHovered = this.hoveredZoneId === id;

      if (isActive) {
        // === UNIQUE ACTIVE NODE ANIMATIONS ===

        // 1. High-Frequency Double-Pulse Quantum Throbbing (Systolic/Diastolic Heartbeat)
        const doublePulse = Math.sin(t * 7.5) * 0.12 + Math.sin(t * 15.0) * 0.06;
        const activeScale = (isHovered ? 1.15 : 1.05) + doublePulse;
        node.coreMesh.scale.set(activeScale, activeScale, activeScale);

        // 2. Rapid Multi-Axis Crystalline Cage Tumbling with Energetic Shimmer
        node.latticeMesh.rotation.y += 0.022;
        node.latticeMesh.rotation.x += 0.016;
        node.latticeMesh.rotation.z += 0.012;
        node.latticeMesh.material.opacity = 0.5 + Math.sin(t * 12.0) * 0.25;

        // 3. Relativistic Gyroscopic Orbital Spin with Precession Wobble
        const activeGyroSpeed = 0.055;
        node.gyroRing1.rotation.x += activeGyroSpeed;
        node.gyroRing1.rotation.z += activeGyroSpeed * 0.7 + Math.sin(t * 4.0) * 0.02;
        node.gyroRing2.rotation.y += activeGyroSpeed * 1.4;
        node.gyroRing2.rotation.x += activeGyroSpeed * 0.8 + Math.cos(t * 4.0) * 0.02;

        // 4. Expanding Concentric Radiant Energy Shockwaves (Pulsing outwards into 3D space)
        if (node.shockRing1 && node.shockRing2) {
          node.shockRing1.visible = true;
          node.shockRing2.visible = true;

          const waveProgress1 = (t * 1.3) % 1.0;
          const waveScale1 = 1.0 + waveProgress1 * 3.0;
          const waveOp1 = Math.sin(waveProgress1 * Math.PI) * 0.85;
          node.shockRing1.scale.set(waveScale1, waveScale1, waveScale1);
          node.shockRing1.material.opacity = waveOp1;

          const waveProgress2 = (t * 1.3 + 0.5) % 1.0;
          const waveScale2 = 1.0 + waveProgress2 * 3.0;
          const waveOp2 = Math.sin(waveProgress2 * Math.PI) * 0.85;
          node.shockRing2.scale.set(waveScale2, waveScale2, waveScale2);
          node.shockRing2.material.opacity = waveOp2;
        }

        // 5. Active Plasma Spark Fountain (Continuous 3D omni-directional particle spew)
        if (node.sparkEmitter && node.sparkData) {
          node.sparkEmitter.visible = true;
          node.sparkEmitter.material.opacity = 0.95;

          const posAttr = node.sparkEmitter.geometry.attributes.position;
          const colAttr = node.sparkEmitter.geometry.attributes.color;
          const posArray = posAttr.array;
          const colArray = colAttr.array;

          for (let i = 0; i < node.sparkCount; i++) {
            const spark = node.sparkData[i];
            spark.life += 0.016 * spark.speed;

            if (spark.life >= 1.0) {
              spark.life = 0.0;
              const u = Math.random();
              const v = Math.random();
              const theta = u * 2.0 * Math.PI;
              const phi = Math.acos(2.0 * v - 1.0);
              const sinPhi = Math.sin(phi);
              spark.dir.set(
                sinPhi * Math.cos(theta),
                sinPhi * Math.sin(theta),
                Math.cos(phi)
              ).normalize();
            }

            const progress = spark.life;
            const dist = node.baseRadius + Math.sin(progress * Math.PI * 0.5) * spark.maxDist;

            // Micro-spiral turbulence curl
            const curl = Math.sin(t * 8.0 + i) * 0.35;
            posArray[i * 3] = spark.dir.x * dist + curl * spark.dir.y;
            posArray[i * 3 + 1] = spark.dir.y * dist + curl * spark.dir.z;
            posArray[i * 3 + 2] = spark.dir.z * dist + curl * spark.dir.x;

            const alpha = 1.0 - progress;
            if (progress < 0.2) {
              // White-hot plasma spark at core eruption
              colArray[i * 3] = 1.0;
              colArray[i * 3 + 1] = 0.95;
              colArray[i * 3 + 2] = 1.0;
            } else {
              // Glowing crimson/magenta plasma ember fading out
              colArray[i * 3] = 1.0 * alpha;
              colArray[i * 3 + 1] = 0.1 * alpha;
              colArray[i * 3 + 2] = 0.45 * alpha;
            }
          }

          posAttr.needsUpdate = true;
          colAttr.needsUpdate = true;
        }

        // 6. Dynamic Real-Time PointLight Energy Flare (Illuminating environment)
        node.pointLight.intensity = 1.6 + Math.sin(t * 9.0) * 0.8;

      } else {
        // === IDLE / STANDARD NODE ANIMATIONS ===
        if (node.shockRing1) node.shockRing1.visible = false;
        if (node.shockRing2) node.shockRing2.visible = false;
        if (node.sparkEmitter) node.sparkEmitter.visible = false;

        const pulseSpeed = isHub ? 3.5 : 1.8;
        const pulseAmp = isHovered ? 0.12 : isHub ? 0.07 : 0.04;
        const scale = (isHovered ? 1.1 : 1.0) + Math.sin(t * pulseSpeed) * pulseAmp;
        node.coreMesh.scale.set(scale, scale, scale);

        node.latticeMesh.rotation.y += 0.005;
        node.latticeMesh.rotation.x += 0.003;

        const spinSpeed = node.spinSpeed || 0.01;
        node.gyroRing1.rotation.x += spinSpeed;
        node.gyroRing1.rotation.z += spinSpeed * 0.5;
        node.gyroRing2.rotation.y += spinSpeed * 1.35;
        node.gyroRing2.rotation.x += spinSpeed * 0.6;
      }

      // 6. Stale claim warning strobe
      if (zState?.hasStaleHeartbeat) {
        const strobe = Math.sin(t * 18) > 0 ? 0.2 : 1.4;
        node.coreMesh.material.emissiveIntensity = strobe;
        node.coreMesh.material.emissive.setHex(0xff0055);
      }
    }

    // Animate continuous light beam pulses along axons
    const upVector = new THREE.Vector3(0, 1, 0);
    for (const axon of this.axonLines) {
      const isLineConnectedToHover = this.hoveredZoneId && (axon.source === this.hoveredZoneId || axon.target === this.hoveredZoneId);

      if (axon.isActive) {
        // Overdrive High-Voltage Conduit Electric Wave
        if (axon.conduit) {
          axon.conduit.material.opacity = 0.55 + Math.sin(t * 8.0 + axon.phase) * 0.25;
          axon.conduit.material.color.setHex(0xff0055);
        }
        axon.line.material.opacity = 0.75 + Math.sin(t * 11.0 + axon.phase) * 0.15;
        axon.line.material.color.setHex(0xff0055);
      } else if (isLineConnectedToHover) {
        axon.line.material.opacity = 0.95;
        axon.line.material.color.setHex(0x00ffff);
        if (axon.conduit) {
          axon.conduit.material.opacity = 0.82;
          axon.conduit.material.color.setHex(0x00ffff);
        }
      } else if (!this.safeZoneMode) {
        // Subtle optical conduit breathing shimmer
        const baseOp = 0.14;
        if (axon.conduit) {
          axon.conduit.material.opacity = baseOp + Math.sin(t * 3.0 + axon.phase) * 0.06;
        }
        axon.line.material.opacity = 0.22 + Math.sin(t * 2.5 + axon.phase) * 0.04;
      }

      for (const p of axon.particles) {
        if (p.mesh.visible) {
          const speedMultiplier = axon.isActive ? 2.8 : (isLineConnectedToHover ? 2.6 : 1.0);
          p.progress = (p.progress + p.speed * speedMultiplier) % 1.0;
          const pt = axon.curve.getPointAt(p.progress);
          const tangent = axon.curve.getTangentAt(p.progress).normalize();
          p.mesh.position.copy(pt);
          // Streamlined orientation along curve tangent vector
          p.mesh.quaternion.setFromUnitVectors(upVector, tangent);
        }
      }
    }

    // Raycast hover highlighting
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hitCandidates = Array.from(this.nodeMeshes.values()).map((n) => n.coreMesh);
    const intersects = this.raycaster.intersectObjects(hitCandidates);

    if (intersects.length > 0) {
      const hitObject = intersects[0].object;
      const hitZoneId = hitObject.userData.zoneId;
      if (this.hoveredZoneId !== hitZoneId) {
        this.hoveredZoneId = hitZoneId;
        document.body.style.cursor = "pointer";
      }
    } else if (this.hoveredZoneId) {
      this.hoveredZoneId = null;
      document.body.style.cursor = "default";
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
