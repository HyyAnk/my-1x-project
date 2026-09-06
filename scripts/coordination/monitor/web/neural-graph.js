import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ZONE_POSITIONS, COLOR_MAP } from "./topology-layout.js";

export { ZONE_POSITIONS, COLOR_MAP };

export class NeuralGraph {
  constructor(containerElement, onNodeSelect, onFileSelect, onFileHover) {
    this.container = containerElement;
    this.onNodeSelect = onNodeSelect || (() => {});
    this.onFileSelect = onFileSelect || (() => {});
    this.onFileHover = onFileHover || (() => {});
    this.nodeMeshes = new Map();
    this.axonLines = [];
    this.layerTendrils = [];
    this.fileNodes = new Map(); // path -> fileNode
    this.fileNodesByIndex = []; // index -> fileNode
    this.zoneOrbitalData = new Map(); // zoneId -> { speed, phase }
    this.fileInstancedMesh = null;
    this.dendriteLineSegments = null;
    this.hoveredFileNode = null;
    this.mouseClientX = 0;
    this.mouseClientY = 0;
    this.coordinationState = null;
    this.hoveredZoneId = null;
    this.autoRotate = false;
    this.safeZoneMode = null;
    this.cameraAnimation = null;
    this.synapticPhotons = [];
    this.hologramBadges = [];
    this.microHalos = [];
    this.badgeSideToggle = 0;
    this.enablePulses = true;
    this.enableBloom = true;
    this.heatmapMode = false;
    this.cameraMode = 0; // 0: orbit, 1: agent_follow, 2: top_down, 3: cockpit
    this.agentDrones = new Map(); // claimId -> droneObject
    this.blastShockwaves = [];
    this.fileHeatMap = new Map(); // path -> heatNumber (0.0 - 3.0)
    this.zoneHeatMap = new Map(); // zoneId -> heatNumber (0.0 - 5.0)
    this.batchEventQueue = new Map(); // zoneId -> array of events
    this.batchFlushTimers = new Map();

    this.initScene();
    this.initPostProcessing();
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

  initPostProcessing() {
    const width = this.container.clientWidth || window.innerWidth || 800;
    const height = this.container.clientHeight || window.innerHeight || 600;

    try {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.85, // bloom strength
        0.42, // radius
        0.2   // threshold (selective bloom: deep space stays crisp)
      );
      this.bloomPass = bloomPass;
      this.composer.addPass(bloomPass);

      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);
      this.enableBloom = true;
    } catch (err) {
      console.warn("Post-processing initialization fallback:", err);
      this.composer = null;
      this.enableBloom = false;
    }
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
      if (this.composer) {
        this.composer.setSize(width, height);
      }
    });

    this.renderer.domElement.addEventListener("mousemove", (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.mouseClientX = e.clientX;
      this.mouseClientY = e.clientY;
    });

    this.renderer.domElement.addEventListener("click", () => {
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // 1. Check if a File Micro-Neuron was clicked
      if (this.fileInstancedMesh) {
        const fileHits = this.raycaster.intersectObject(this.fileInstancedMesh);
        if (fileHits.length > 0 && typeof fileHits[0].instanceId === "number") {
          const fileNode = this.fileNodesByIndex[fileHits[0].instanceId];
          if (fileNode) {
            this.onFileSelect(fileNode);
            return;
          }
        }
      }

      // 2. Check if a Zone Macro-Node was clicked
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
        pointLight,
        labelSprite,
        baseRadius: pos.radius,
        baseColor,
        zone,
        layer: pos.layer,
        spinSpeed: 0.01,
        excitation: 0.0,
        lastSpikeTime: 0,
        lastFileName: null,
        lastEventType: null,
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

    // 4. Build File Micro-Neurons Galaxy (1,100+ files as micro-synaptic star clusters)
    if (topology.files && topology.files.length > 0) {
      this.buildFileMicroNeurons(topology.files);
    }
  }

  buildFileMicroNeurons(files) {
    if (!files || files.length === 0) return;

    // Clean up previous if any
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

    // Group files by zone
    const filesByZone = new Map();
    for (const f of files) {
      if (!filesByZone.has(f.zoneId)) filesByZone.set(f.zoneId, []);
      filesByZone.get(f.zoneId).push(f);
    }

    const totalFiles = files.length;
    const sphereGeo = new THREE.SphereGeometry(0.38, 8, 6);
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

    const dummy = new THREE.Object3D();
    const goldenAngle = Math.PI * (3.0 - Math.sqrt(5.0)); // ~2.39996 rad
    let globalIdx = 0;

    for (const [zoneId, zoneFiles] of filesByZone.entries()) {
      const zonePos = ZONE_POSITIONS[zoneId] || { x: 0, y: 0, z: 0, radius: 4 };
      const zoneColorHex = COLOR_MAP[zoneId] || 0x00f0ff;
      const zoneColor = new THREE.Color(zoneColorHex);
      const N = zoneFiles.length;

      // Assign unique, serene orbital velocity and phase for this zone cluster
      const speedSeed = zoneId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const orbitalSpeed = 0.08 + (speedSeed % 7) * 0.015;
      const direction = speedSeed % 2 === 0 ? 1 : -1;
      this.zoneOrbitalData.set(zoneId, {
        speed: orbitalSpeed * direction,
        phase: (speedSeed * 0.13) % (Math.PI * 2),
      });

      const rMin = (zonePos.radius || 4) + 2.5;
      const rMax = (zonePos.radius || 4) + Math.min(22, 6.0 + Math.sqrt(N) * 2.2);

      for (let i = 0; i < N; i++) {
        const file = zoneFiles[i];
        const normIdx = (i + 0.5) / N;
        const radius = rMin + (rMax - rMin) * Math.sqrt(normIdx);
        const theta = i * goldenAngle;
        const v = 1.0 - 2.0 * normIdx; // from 1 down to -1

        // Slightly flattened ellipsoid for galactic disk aesthetic
        const yRel = v * radius * 0.65;
        const rXY = Math.sqrt(Math.max(0, radius * radius - yRel * yRel));
        const xRel = rXY * Math.cos(theta);
        const zRel = rXY * Math.sin(theta);

        const worldX = zonePos.x + xRel;
        const worldY = zonePos.y + yRel;
        const worldZ = zonePos.z + zRel;

        dummy.position.set(worldX, worldY, worldZ);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();

        this.fileInstancedMesh.setMatrixAt(globalIdx, dummy.matrix);
        this.fileInstancedMesh.setColorAt(globalIdx, zoneColor);

        // Record dendrite segment from file to zone center
        const pIdx = globalIdx * 6;
        dendritePositions[pIdx] = worldX;
        dendritePositions[pIdx + 1] = worldY;
        dendritePositions[pIdx + 2] = worldZ;
        dendritePositions[pIdx + 3] = zonePos.x;
        dendritePositions[pIdx + 4] = zonePos.y;
        dendritePositions[pIdx + 5] = zonePos.z;

        // Dendrite colors
        dendriteColors[pIdx] = zoneColor.r * 0.8;
        dendriteColors[pIdx + 1] = zoneColor.g * 0.8;
        dendriteColors[pIdx + 2] = zoneColor.b * 0.8;
        dendriteColors[pIdx + 3] = zoneColor.r * 0.25;
        dendriteColors[pIdx + 4] = zoneColor.g * 0.25;
        dendriteColors[pIdx + 5] = zoneColor.b * 0.25;

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

        globalIdx++;
      }
    }

    this.fileInstancedMesh.instanceMatrix.needsUpdate = true;
    this.fileInstancedMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.fileInstancedMesh);

    // Build dendrite line segments
    const dendriteGeo = new THREE.BufferGeometry();
    dendriteGeo.setAttribute("position", new THREE.BufferAttribute(dendritePositions, 3));
    dendriteGeo.setAttribute("color", new THREE.BufferAttribute(dendriteColors, 3));
    const dendriteMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dendriteLineSegments = new THREE.LineSegments(dendriteGeo, dendriteMat);
    this.scene.add(this.dendriteLineSegments);
  }

  findFileNodeByName(fileName) {
    if (!fileName) return null;
    for (const [_, node] of this.fileNodes) {
      if (node.name === fileName) return node;
    }
    return null;
  }

  fireDendritePhoton(fileNode) {
    const curve = new THREE.LineCurve3(fileNode.worldPos, fileNode.zonePos);
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.24, 1.2, 4, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1.0,
      })
    );
    this.scene.add(mesh);
    this.synapticPhotons.push({
      mesh,
      curve,
      forward: true,
      progress: 0.0,
      speed: 0.045, // fast laser dash into zone center
      targetZoneId: fileNode.zoneId,
      startTime: performance.now(),
    });
  }

  spawnMicroHalo(pos, eventType) {
    const haloColor = 0xbf00ff; // Neon Purple / Electric Violet
    const ringGeo = new THREE.RingGeometry(0.55, 0.82, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: haloColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(pos);
    ringMesh.quaternion.copy(this.camera.quaternion);
    this.scene.add(ringMesh);

    this.microHalos.push({
      mesh: ringMesh,
      startTime: performance.now(),
      durationMs: 1200,
    });
  }

  spawnHologramBadgeAtPos(pos, fileName, eventType, agentName = null, isBatch = false) {
    const canvas = document.createElement("canvas");
    canvas.width = 440;
    canvas.height = 104;
    const ctx = canvas.getContext("2d");

    let strokeColor = "#bf00ff";
    let textColor = "#f0abfc";
    let prefix = "⚡ ";
    let bgColor = "rgba(24, 8, 42, 0.94)";

    if (isBatch) {
      strokeColor = "#00f0ff";
      textColor = "#a5f3fc";
      prefix = "📦 ";
      bgColor = "rgba(6, 26, 44, 0.94)";
    } else if (eventType === "add") {
      strokeColor = "#10b981";
      textColor = "#a7f3d0";
      prefix = "+ ";
      bgColor = "rgba(6, 32, 22, 0.94)";
    } else if (eventType === "unlink") {
      strokeColor = "#ef4444";
      textColor = "#fca5a5";
      prefix = "✕ ";
      bgColor = "rgba(36, 10, 16, 0.94)";
    }

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 4.0;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(8, 8, 424, 88, 24);
    } else {
      ctx.rect(8, 8, 424, 88);
    }
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = "bold 26px 'JetBrains Mono', monospace";
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const agentTag = agentName ? `[${agentName}] ` : "";
    const cleanFileName = fileName.length > 20 ? fileName.slice(0, 18) + "…" : fileName;
    const fullText = `${agentTag}${prefix}${cleanFileName}`;

    ctx.fillText(fullText, 220, 52);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(13.5, 3.2, 1);
    const startY = pos.y + 2.5;
    sprite.position.set(pos.x, startY, pos.z);

    // Find the lowest unoccupied slot index (0, 1, 2, 3...)
    const occupiedSlots = new Set(this.hologramBadges.map((b) => b.slotIndex));
    let slotIndex = 0;
    while (occupiedSlots.has(slotIndex)) {
      slotIndex++;
    }

    const col = slotIndex % 2; // 0 = Left, 1 = Right
    const tier = Math.floor(slotIndex / 2);
    const sideSign = col === 0 ? -1 : 1;
    const horizontalOffset = sideSign * 22.0; // 44 units separation between Left and Right
    const targetHeight = 22.0 + tier * 15.0; // 15 units vertical gap between tiers

    // Glowing neon leader line connecting source to the rising badge
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pos.x, pos.y, pos.z),
      new THREE.Vector3(pos.x, startY, pos.z),
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(strokeColor),
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const leaderLine = new THREE.Line(lineGeo, lineMat);
    this.scene.add(leaderLine);

    this.scene.add(sprite);
    this.hologramBadges.push({
      sprite,
      texture,
      leaderLine,
      baseX: pos.x,
      baseY: pos.y,
      baseZ: pos.z,
      startY,
      slotIndex,
      horizontalOffset,
      targetHeight,
      startTime: performance.now(),
      durationMs: 7200, // 7.2s lifetime
    });
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

    // Synchronize 3D Agent Quantum Drones
    this.updateAgentDrones(state.claims || []);
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

  togglePulses(forceState) {
    this.enablePulses = typeof forceState === "boolean" ? forceState : !this.enablePulses;
    return this.enablePulses;
  }

  toggleBloom(forceState) {
    this.enableBloom = typeof forceState === "boolean" ? forceState : !this.enableBloom;
    return this.enableBloom;
  }

  toggleHeatmap(forceState) {
    this.heatmapMode = typeof forceState === "boolean" ? forceState : !this.heatmapMode;
    return this.heatmapMode;
  }

  cycleCameraMode() {
    this.cameraMode = (this.cameraMode + 1) % 4;
    return this.applyCameraMode();
  }

  setCameraMode(modeIndex) {
    this.cameraMode = modeIndex % 4;
    return this.applyCameraMode();
  }

  applyCameraMode() {
    if (this.cameraMode === 0) {
      this.controls.target.set(0, 5, 0);
      this.cameraAnimation = {
        targetPos: this.defaultCameraPos.clone(),
        targetLookAt: new THREE.Vector3(0, 5, 0),
      };
      return "Cam: Orbit";
    } else if (this.cameraMode === 1) {
      const activeDrones = Array.from(this.agentDrones.values()).filter((d) => !d.isWarpingOut);
      if (activeDrones.length > 0) {
        const drone = activeDrones[0];
        const dPos = drone.group.position;
        this.cameraAnimation = {
          targetPos: new THREE.Vector3(dPos.x + 22, dPos.y + 14, dPos.z + 32),
          targetLookAt: dPos.clone(),
        };
        return `Cam: ${drone.agentName}`;
      } else {
        this.cameraAnimation = {
          targetPos: new THREE.Vector3(0, 55, 120),
          targetLookAt: new THREE.Vector3(0, 30, 0),
        };
        return "Cam: Agent (Idle)";
      }
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

  triggerBlastRadius(zoneId, dependentZones = []) {
    const zonePos = ZONE_POSITIONS[zoneId];
    if (!zonePos) return;

    // Expanding shockwave ring centered at zone soma
    const ringGeo = new THREE.RingGeometry(0.6, 2.2, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(zonePos.x, zonePos.y, zonePos.z);
    ringMesh.rotation.x = Math.PI / 2;
    this.scene.add(ringMesh);

    this.blastShockwaves.push({
      mesh: ringMesh,
      startTime: performance.now(),
      durationMs: 1800,
      maxScale: 26.0,
    });

    // Secondary vertical billboard shockwave
    const ringGeo2 = new THREE.RingGeometry(0.5, 1.8, 36);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.position.set(zonePos.x, zonePos.y, zonePos.z);
    ringMesh2.quaternion.copy(this.camera.quaternion);
    this.scene.add(ringMesh2);

    this.blastShockwaves.push({
      mesh: ringMesh2,
      startTime: performance.now(),
      durationMs: 1400,
      maxScale: 20.0,
    });

    // Cascade resonance to dependent zones
    for (const depId of dependentZones) {
      const depNode = this.nodeMeshes.get(depId);
      if (depNode) {
        depNode.resonance = 1.0;
      }
    }
  }

  updateAgentDrones(claims = []) {
    const activeClaimIds = new Set();

    for (const claim of claims) {
      if (claim.isDead) continue;
      activeClaimIds.add(claim.id);

      let drone = this.agentDrones.get(claim.id);
      if (!drone) {
        drone = this.createAgentDrone(claim);
        this.agentDrones.set(claim.id, drone);
      } else {
        drone.plannedFiles = claim.plannedFiles || [];
        const targetZoneId = (claim.writeZones && claim.writeZones[0]) || drone.targetZoneId;
        if (targetZoneId !== drone.targetZoneId) {
          drone.targetZoneId = targetZoneId;
          const newPos = ZONE_POSITIONS[targetZoneId] || { x: 0, y: 0, z: 0 };
          drone.zonePos = newPos;
        }
      }
    }

    for (const [claimId, drone] of this.agentDrones.entries()) {
      if (!activeClaimIds.has(claimId) && !drone.isWarpingOut) {
        drone.isWarpingOut = true;
        drone.warpStartTime = performance.now();
      }
    }
  }

  createAgentDrone(claim) {
    const droneGroup = new THREE.Group();
    const targetZoneId = (claim.writeZones && claim.writeZones[0]) || "agent-coordination";
    const zonePos = ZONE_POSITIONS[targetZoneId] || { x: 0, y: 0, z: 0, radius: 4 };

    droneGroup.position.set(zonePos.x, zonePos.y + 10, zonePos.z);
    droneGroup.scale.set(0.01, 0.01, 0.01);

    // 1. Quantum Core (Dual Octahedron)
    const coreGeo = new THREE.OctahedronGeometry(1.6, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.25,
      roughness: 0.15,
      metalness: 0.85,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    droneGroup.add(coreMesh);

    // 2. Kinetic Gyro Rings / Shield
    const shieldGeo = new THREE.IcosahedronGeometry(2.5, 1);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    droneGroup.add(shieldMesh);

    // 3. Drone PointLight
    const droneLight = new THREE.PointLight(0x00f0ff, 1.8, 30);
    droneGroup.add(droneLight);

    // 4. Drone Agent Hologram Tag
    const tagSprite = this.createAgentLabelSprite(claim.agent || "agent");
    tagSprite.position.set(0, 3.8, 0);
    droneGroup.add(tagSprite);

    // 5. Dynamic Laser Scanner Beam
    const scannerGeo = new THREE.BufferGeometry();
    const scannerPos = new Float32Array(6);
    scannerGeo.setAttribute("position", new THREE.BufferAttribute(scannerPos, 3));
    const scannerMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const scannerLine = new THREE.Line(scannerGeo, scannerMat);
    this.scene.add(scannerLine);

    this.scene.add(droneGroup);

    return {
      claimId: claim.id,
      agentName: claim.agent,
      targetZoneId,
      zonePos,
      group: droneGroup,
      coreMesh,
      shieldMesh,
      droneLight,
      tagSprite,
      scannerLine,
      plannedFiles: claim.plannedFiles || [],
      orbitAngle: Math.random() * Math.PI * 2,
      orbitSpeed: 0.03,
      orbitRadius: (zonePos.radius || 4) * 2.2 + 6.0,
      scale: 0.01,
      targetScale: 1.0,
      isWarpingOut: false,
      warpStartTime: 0,
      targetPos: new THREE.Vector3(zonePos.x, zonePos.y, zonePos.z),
      isTargetingFile: false,
      targetTimer: 0,
    };
  }

  createAgentLabelSprite(agentName) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(10, 16, 30, 0.92)";
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 3.0;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 12;
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(4, 4, 248, 56, 14);
    } else {
      ctx.rect(4, 4, 248, 56);
    }
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = "bold 22px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const displayName = agentName.length > 14 ? agentName.slice(0, 12) + "…" : agentName;
    ctx.fillText(`🤖 ${displayName}`, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(8.0, 2.0, 1);
    return sprite;
  }

  disposeDrone(drone) {
    if (!drone) return;
    this.scene.remove(drone.group);
    drone.coreMesh.geometry.dispose();
    drone.coreMesh.material.dispose();
    drone.shieldMesh.geometry.dispose();
    drone.shieldMesh.material.dispose();
    drone.tagSprite.material.map.dispose();
    drone.tagSprite.material.dispose();
    if (drone.scannerLine) {
      this.scene.remove(drone.scannerLine);
      drone.scannerLine.geometry.dispose();
      drone.scannerLine.material.dispose();
    }
  }

  triggerFileActivity(activity) {
    if (!this.enablePulses || !activity || !activity.zoneId) return;

    // Buffer by zoneId with 200ms debounce window
    const { zoneId } = activity;
    if (!this.batchEventQueue.has(zoneId)) {
      this.batchEventQueue.set(zoneId, []);
    }
    this.batchEventQueue.get(zoneId).push(activity);

    if (this.batchFlushTimers.has(zoneId)) {
      clearTimeout(this.batchFlushTimers.get(zoneId));
    }

    const timer = setTimeout(() => {
      this.flushBatchActivity(zoneId);
    }, 200);
    this.batchFlushTimers.set(zoneId, timer);
  }

  flushBatchActivity(zoneId) {
    this.batchFlushTimers.delete(zoneId);
    const activities = this.batchEventQueue.get(zoneId) || [];
    this.batchEventQueue.delete(zoneId);
    if (activities.length === 0) return;

    // If batch has >= 4 files, spawn a single consolidated cluster badge!
    if (activities.length >= 4) {
      const firstAct = activities[0];
      const agentName = firstAct.agent || null;
      const zoneNode = this.nodeMeshes.get(zoneId);
      const zonePos = zoneNode ? zoneNode.group.position : (ZONE_POSITIONS[zoneId] || { x: 0, y: 0, z: 0 });
      const zoneName = zoneNode?.zone?.name || zoneId;

      this.spawnHologramBadgeAtPos(
        zonePos,
        `${activities.length} files in ${zoneName}`,
        "change",
        agentName,
        true
      );

      // Trigger zone excitation & blast radius for the batch
      if (zoneNode) {
        zoneNode.excitation = 1.0;
        zoneNode.lastSpikeTime = performance.now();
        this.fireSynapticPhotons(zoneId, firstAct.dependentZones || []);
        if (zoneNode.zone?.risk === "high" || zoneId === "shared-contracts" || (firstAct.dependentZones && firstAct.dependentZones.length > 0)) {
          this.triggerBlastRadius(zoneId, firstAct.dependentZones || []);
        }
      }

      // Visually excite individual micro-neurons without separate badges
      for (const act of activities) {
        this.exciteMicroNeuron(act, false);
      }
    } else {
      // Normal activity for 1-3 files
      for (const act of activities) {
        this.processSingleFileActivity(act);
      }
    }
  }

  processSingleFileActivity(activity) {
    const { zoneId, file, fileName, eventType, dependentZones, agent } = activity;

    // Accumulate heat
    if (file) {
      const curFileHeat = (this.fileHeatMap.get(file) || 0) + 1.2;
      this.fileHeatMap.set(file, Math.min(3.0, curFileHeat));
    }
    const curZoneHeat = (this.zoneHeatMap.get(zoneId) || 0) + 0.8;
    this.zoneHeatMap.set(zoneId, Math.min(5.0, curZoneHeat));

    // Excite micro neuron
    const fileNode = this.exciteMicroNeuron(activity, true);

    // Cascade into zone macro-neuron
    const zoneNode = this.nodeMeshes.get(zoneId);
    if (zoneNode) {
      setTimeout(() => {
        zoneNode.excitation = 1.0;
        zoneNode.lastSpikeTime = performance.now();
        this.fireSynapticPhotons(zoneId, dependentZones || []);

        // Trigger Risk Blast Radius shockwave if high risk or has dependencies
        if (zoneNode.zone?.risk === "high" || zoneId === "shared-contracts" || (dependentZones && dependentZones.length > 0)) {
          this.triggerBlastRadius(zoneId, dependentZones || []);
        }
      }, fileNode ? 180 : 0);

      if (!fileNode) {
        this.spawnHologramBadgeAtPos(zoneNode.group.position, fileName || "file", eventType || "change", agent, false);
      }
    }
  }

  exciteMicroNeuron(activity, spawnBadge = true) {
    const { zoneId, file, fileName, eventType, agent } = activity;
    const fileKey = file ? file.replace(/\\/g, "/") : null;
    let fileNode = fileKey ? this.fileNodes.get(fileKey) : null;
    if (!fileNode && fileName) {
      fileNode = this.findFileNodeByName(fileName);
    }

    if (fileNode) {
      fileNode.excitation = 1.0;
      fileNode.lastSpikeTime = performance.now();
      fileNode.eventType = eventType || "change";
      fileNode.orbitalSurge = 1.0;
      fileNode.dendriteSurge = 1.0;

      this.spawnMicroHalo(fileNode.worldPos, eventType || "change");
      if (spawnBadge) {
        this.spawnHologramBadgeAtPos(fileNode.worldPos, fileName || fileNode.name, eventType || "change", agent, false);
      }
      this.fireDendritePhoton(fileNode);

      // Direct drone laser scanner toward this micro-neuron if drone exists for this agent
      if (agent) {
        for (const [_, drone] of this.agentDrones) {
          if (drone.agentName === agent) {
            drone.targetPos = fileNode.worldPos.clone();
            drone.isTargetingFile = true;
            drone.targetTimer = performance.now() + 3000;
          }
        }
      }
    }

    return fileNode;
  }

  fireSynapticPhotons(sourceZoneId, dependentZones = []) {
    const depSet = new Set(dependentZones);
    const upVector = new THREE.Vector3(0, 1, 0);

    for (const axon of this.axonLines) {
      const isOutbound = axon.source === sourceZoneId;
      const isInbound = axon.target === sourceZoneId;
      const isConnectedDep = depSet.has(axon.source) || depSet.has(axon.target);

      if (isOutbound || isInbound || isConnectedDep) {
        const mesh = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.32, 1.8, 6, 10),
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.95,
          })
        );

        this.scene.add(mesh);
        this.synapticPhotons.push({
          mesh,
          curve: axon.curve,
          forward: isOutbound,
          progress: isOutbound ? 0.0 : 1.0,
          speed: 0.024,
          targetZoneId: isOutbound ? axon.target : axon.source,
          startTime: performance.now(),
        });
      }
    }
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

        // 4. Dynamic Real-Time PointLight Energy Flare (Illuminating environment)
        node.pointLight.intensity = 1.6 + Math.sin(t * 9.0) * 0.8;

      } else {
        // === IDLE / STANDARD NODE ANIMATIONS ===
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

      // Synaptic Excitation on Zone Macro-Node (Clean energy surge & gentle decay, NO particles, NO shockwaves)
      if (node.excitation > 0) {
        node.excitation = Math.max(0, node.excitation - 0.0035);
        const excScale = 1.0 + node.excitation * 0.15;
        node.coreMesh.scale.multiplyScalar(excScale);
        node.coreMesh.material.emissiveIntensity = Math.max(node.coreMesh.material.emissiveIntensity, 0.7 + node.excitation * 1.8);
        node.pointLight.intensity = Math.max(node.pointLight.intensity, 0.8 + node.excitation * 1.4);
      }

      // 7. Stale claim warning strobe
      if (zState?.hasStaleHeartbeat) {
        const strobe = Math.sin(t * 18) > 0 ? 0.2 : 1.4;
        node.coreMesh.material.emissiveIntensity = strobe;
        node.coreMesh.material.emissive.setHex(0xff0055);
      }
    }

    // Animate high-speed synaptic photon laser packets
    const upVector = new THREE.Vector3(0, 1, 0);
    for (let i = this.synapticPhotons.length - 1; i >= 0; i--) {
      const photon = this.synapticPhotons[i];
      if (photon.forward) {
        photon.progress += photon.speed;
        if (photon.progress >= 1.0) {
          const targetNode = this.nodeMeshes.get(photon.targetZoneId);
          if (targetNode) {
            targetNode.excitation = Math.max(targetNode.excitation, 0.5);
          }
          this.scene.remove(photon.mesh);
          photon.mesh.geometry.dispose();
          photon.mesh.material.dispose();
          this.synapticPhotons.splice(i, 1);
          continue;
        }
      } else {
        photon.progress -= photon.speed;
        if (photon.progress <= 0.0) {
          const targetNode = this.nodeMeshes.get(photon.targetZoneId);
          if (targetNode) {
            targetNode.excitation = Math.max(targetNode.excitation, 0.5);
          }
          this.scene.remove(photon.mesh);
          photon.mesh.geometry.dispose();
          photon.mesh.material.dispose();
          this.synapticPhotons.splice(i, 1);
          continue;
        }
      }

      const pt = photon.curve.getPointAt(photon.progress);
      const tangent = photon.curve.getTangentAt(photon.progress).normalize();
      photon.mesh.position.copy(pt);
      photon.mesh.quaternion.setFromUnitVectors(upVector, tangent);
    }

    // Animate floating hologram badges: Deterministic tiered non-overlapping slots with horizontal drift & neon leader lines
    const now = performance.now();

    // 1. Clean up expired badges
    for (let i = this.hologramBadges.length - 1; i >= 0; i--) {
      const badge = this.hologramBadges[i];
      if (now - badge.startTime >= badge.durationMs) {
        this.scene.remove(badge.sprite);
        badge.sprite.material.map.dispose();
        badge.sprite.material.dispose();
        if (badge.leaderLine) {
          this.scene.remove(badge.leaderLine);
          badge.leaderLine.geometry.dispose();
          badge.leaderLine.material.dispose();
        }
        this.hologramBadges.splice(i, 1);
      }
    }

    // 2. Purely horizontal camera-right vector (orthogonal to view direction, strictly in XZ plane with Y = 0)
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const camRightFlat = new THREE.Vector3(camRight.x, 0, camRight.z);
    if (camRightFlat.lengthSq() > 0.001) {
      camRightFlat.normalize();
    } else {
      camRightFlat.set(1, 0, 0);
    }

    // 3. Update each badge along its dedicated, non-overlapping slot trajectory
    for (let i = 0; i < this.hologramBadges.length; i++) {
      const badge = this.hologramBadges[i];
      const elapsed = now - badge.startTime;
      const progress = elapsed / badge.durationMs;

      // Vertical rise: strictly world Y, rising up to its allocated tier height (Tier 0: 22, Tier 1: 37, Tier 2: 52...)
      const verticalRise = Math.pow(progress, 0.75) * badge.targetHeight;

      // Horizontal drift: strictly along camRightFlat (Left: -22, Right: +22), ZERO depth distortion!
      const horizontalDrift = Math.pow(progress, 0.8) * badge.horizontalOffset;

      const curX = badge.baseX + camRightFlat.x * horizontalDrift;
      const curY = badge.startY + verticalRise;
      const curZ = badge.baseZ + camRightFlat.z * horizontalDrift;

      badge.sprite.position.set(curX, curY, curZ);

      // Phóng lớn gấp 3 lần (Expands up to 3.0x scale)
      let scaleMult;
      if (progress < 0.25) {
        const inProg = progress / 0.25;
        scaleMult = 1.0 + Math.pow(inProg, 0.6) * 2.0;
      } else if (progress < 0.75) {
        const badgePulse = Math.sin(t * 6.0) * 0.18;
        scaleMult = 3.0 + badgePulse;
      } else {
        const exitProg = (progress - 0.75) / 0.25;
        scaleMult = 3.0 + exitProg * 0.35;
      }

      badge.sprite.scale.set(12 * scaleMult, 3.0 * scaleMult, 1);

      // Smooth fade out in the last 20%
      let opacity = 1.0;
      if (progress > 0.80) {
        opacity = (1.0 - progress) / 0.20;
      }
      badge.sprite.material.opacity = opacity;

      // Update glowing neon leader line from micro-neuron to badge bottom
      if (badge.leaderLine) {
        const linePos = badge.leaderLine.geometry.attributes.position.array;
        linePos[0] = badge.baseX;
        linePos[1] = badge.baseY;
        linePos[2] = badge.baseZ;
        linePos[3] = curX;
        linePos[4] = curY - 1.5 * scaleMult;
        linePos[5] = curZ;
        badge.leaderLine.geometry.attributes.position.needsUpdate = true;
        badge.leaderLine.material.opacity = opacity * 0.55;
      }
    }

    // Animate localized micro-halo energy ripples
    for (let i = this.microHalos.length - 1; i >= 0; i--) {
      const halo = this.microHalos[i];
      const elapsed = now - halo.startTime;
      const progress = elapsed / halo.durationMs;

      if (progress >= 1.0) {
        this.scene.remove(halo.mesh);
        halo.mesh.geometry.dispose();
        halo.mesh.material.dispose();
        this.microHalos.splice(i, 1);
        continue;
      }

      // Smooth energetic expansion 1.0x to 5.0x
      const scale = 1.0 + Math.pow(progress, 0.5) * 4.2;
      halo.mesh.scale.set(scale, scale, scale);
      // Soft power fade out
      halo.mesh.material.opacity = Math.pow(1.0 - progress, 1.4) * 0.95;
      halo.mesh.quaternion.copy(this.camera.quaternion);
    }

    // Animate continuous light beam pulses along axons
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

    // Animate slow cosmic orbital rotation of file micro-neurons and dendrites around zone centers
    if (this.fileInstancedMesh && this.dendriteLineSegments) {
      const posAttr = this.dendriteLineSegments.geometry.attributes.position;
      const colAttr = this.dendriteLineSegments.geometry.attributes.color;
      const dendritePosArray = posAttr.array;
      const dendriteColArray = colAttr ? colAttr.array : null;
      const dummy = new THREE.Object3D();
      const whiteColor = new THREE.Color(0xffffff);
      let needsColorUpdate = false;
      let needsDendriteColorUpdate = false;

      // 1. Precompute orbital rotation (cos, sin) for each of the 19 zones at current time t
      const zoneRotations = new Map();
      for (const [zoneId, orb] of this.zoneOrbitalData.entries()) {
        const angle = t * orb.speed + orb.phase;
        zoneRotations.set(zoneId, {
          cos: Math.cos(angle),
          sin: Math.sin(angle),
          speed: orb.speed,
        });
      }

      // 2. Transform each file micro-neuron and its connecting dendrite filament
      for (let i = 0; i < this.fileNodesByIndex.length; i++) {
        const fileNode = this.fileNodesByIndex[i];
        const rot = zoneRotations.get(fileNode.zoneId);
        const cos = rot ? rot.cos : 1;
        const sin = rot ? rot.sin : 0;

        // Smooth celestial orbital rotation around the local Y-axis of the zone
        let rotX = fileNode.localX * cos - fileNode.localZ * sin;
        let rotZ = fileNode.localX * sin + fileNode.localZ * cos;

        // Micro-neuron kinetic acceleration surge during activation
        if (fileNode.orbitalSurge > 0) {
          fileNode.orbitalSurge = Math.max(0, fileNode.orbitalSurge - 0.007);
          const surgeAngle = Math.sin((1.0 - fileNode.orbitalSurge) * Math.PI) * 0.45;
          const surgeCos = Math.cos(surgeAngle);
          const surgeSin = Math.sin(surgeAngle);
          const sX = rotX * surgeCos - rotZ * surgeSin;
          const sZ = rotX * surgeSin + rotZ * surgeCos;
          rotX = sX;
          rotZ = sZ;
        }

        const worldX = fileNode.zonePos.x + rotX;
        const worldY = fileNode.zonePos.y + fileNode.localY;
        const worldZ = fileNode.zonePos.z + rotZ;

        fileNode.worldPos.set(worldX, worldY, worldZ);

        // Excitation & Pulsing Animation (10.0 seconds duration, 5x scale, neon purple)
        let scale = 1.0;
        const totalDurationMs = 10000;
        const elapsed = fileNode.lastSpikeTime > 0 ? (now - fileNode.lastSpikeTime) : Infinity;

        if (elapsed < totalDurationMs) {
          const progress = elapsed / totalDurationMs; // 0.0 to 1.0 over exactly 10 seconds
          fileNode.excitation = 1.0 - progress;
          needsColorUpdate = true;

          // Electric Neon Purple & Radiant Ultraviolet
          const neonPurple = new THREE.Color(0xbf00ff);
          const brightPurple = new THREE.Color(0xef44ff);

          // Rhythmic heartbeat pulse (~2 Hz oscillation)
          const pulse = Math.sin(t * 10.0) * 0.75 + Math.sin(t * 20.0) * 0.35;

          if (progress < 0.12) {
            // Stage 1: Explosive flash, quickly expanding from 1.0x to 5.0x with white-neon purple core
            const inProg = progress / 0.12;
            const curColor = neonPurple.clone().lerp(whiteColor, (1.0 - inProg) * 0.85);
            this.fileInstancedMesh.setColorAt(fileNode.index, curColor);
            scale = 1.0 + Math.pow(inProg, 0.5) * 4.0 + pulse * 0.4;
          } else if (progress < 0.75) {
            // Stage 2: Sustained giant 5.0x sphere pulsing with neon purple heartbeat
            const curColor = neonPurple.clone().lerp(brightPurple, (pulse + 1.0) * 0.3);
            this.fileInstancedMesh.setColorAt(fileNode.index, curColor);
            scale = 5.0 + pulse * 0.85;
          } else {
            // Stage 3: Smooth energy dissipation from 5.0x back to 1.0x, fading back to zone color
            const exitRatio = (1.0 - progress) / 0.25; // 1 down to 0
            const curColor = fileNode.baseColor.clone().lerp(neonPurple, exitRatio);
            this.fileInstancedMesh.setColorAt(fileNode.index, curColor);
            scale = 1.0 + (4.0 + pulse * 0.5) * exitRatio;
          }
        } else {
          // Check Synaptic Heatmap
          const fileHeat = this.fileHeatMap.get(fileNode.path) || 0;
          if (this.heatmapMode || fileHeat > 0) {
            needsColorUpdate = true;
            fileNode.wasHeatMapped = true;
            if (this.heatmapMode && fileHeat <= 0.05) {
              // Dormant node in heatmap view
              this.fileInstancedMesh.setColorAt(fileNode.index, new THREE.Color(0x1e293b));
            } else {
              // Thermodynamic heat gradient: baseColor -> magenta (1.0) -> gold (2.0) -> white plasma (3.0)
              const heatProg = Math.min(3.0, fileHeat);
              let heatCol = fileNode.baseColor.clone();
              if (heatProg <= 1.0) {
                heatCol.lerp(new THREE.Color(0xd946ef), heatProg);
              } else if (heatProg <= 2.0) {
                heatCol = new THREE.Color(0xd946ef).lerp(new THREE.Color(0xfbbf24), heatProg - 1.0);
              } else {
                heatCol = new THREE.Color(0xfbbf24).lerp(new THREE.Color(0xffffff), heatProg - 2.0);
              }
              this.fileInstancedMesh.setColorAt(fileNode.index, heatCol);
              if (heatProg > 1.0) {
                scale = 1.0 + (heatProg - 1.0) * 0.4;
              }
            }
          } else if (fileNode.wasHeatMapped || fileNode.excitation > 0) {
            fileNode.excitation = 0;
            fileNode.wasHeatMapped = false;
            this.fileInstancedMesh.setColorAt(fileNode.index, fileNode.baseColor);
            needsColorUpdate = true;
          }
        }

        dummy.position.set(worldX, worldY, worldZ);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        this.fileInstancedMesh.setMatrixAt(i, dummy.matrix);

        // Update dendrite line Point 1 (file end)
        const pIdx = i * 6;
        dendritePosArray[pIdx] = worldX;
        dendritePosArray[pIdx + 1] = worldY;
        dendritePosArray[pIdx + 2] = worldZ;

        // High-Voltage Dendrite Surge in Neon Purple
        if (dendriteColArray) {
          if (fileNode.excitation > 0) {
            const surge = fileNode.excitation;
            // File end: vibrant neon purple (R:0.75, G:0.0, B:1.0)
            dendriteColArray[pIdx] = THREE.MathUtils.lerp(fileNode.baseColor.r * 0.8, 0.75, surge);
            dendriteColArray[pIdx + 1] = THREE.MathUtils.lerp(fileNode.baseColor.g * 0.8, 0.0, surge);
            dendriteColArray[pIdx + 2] = THREE.MathUtils.lerp(fileNode.baseColor.b * 0.8, 1.0, surge);
            // Zone center end: radiant violet (R:0.6, G:0.1, B:0.9)
            dendriteColArray[pIdx + 3] = THREE.MathUtils.lerp(fileNode.baseColor.r * 0.25, 0.6, surge);
            dendriteColArray[pIdx + 4] = THREE.MathUtils.lerp(fileNode.baseColor.g * 0.25, 0.1, surge);
            dendriteColArray[pIdx + 5] = THREE.MathUtils.lerp(fileNode.baseColor.b * 0.25, 0.9, surge);
            needsDendriteColorUpdate = true;
            fileNode.wasDendriteSurging = true;
          } else if (fileNode.wasDendriteSurging) {
            dendriteColArray[pIdx] = fileNode.baseColor.r * 0.8;
            dendriteColArray[pIdx + 1] = fileNode.baseColor.g * 0.8;
            dendriteColArray[pIdx + 2] = fileNode.baseColor.b * 0.8;
            dendriteColArray[pIdx + 3] = fileNode.baseColor.r * 0.25;
            dendriteColArray[pIdx + 4] = fileNode.baseColor.g * 0.25;
            dendriteColArray[pIdx + 5] = fileNode.baseColor.b * 0.25;
            fileNode.wasDendriteSurging = false;
            needsDendriteColorUpdate = true;
          }
        }
      }

      this.fileInstancedMesh.instanceMatrix.needsUpdate = true;
      posAttr.needsUpdate = true;
      if (needsColorUpdate) {
        this.fileInstancedMesh.instanceColor.needsUpdate = true;
      }
      if (needsDendriteColorUpdate && colAttr) {
        colAttr.needsUpdate = true;
      }
    }

    // Raycast hover highlighting: Check file micro-neurons first, then macro zone nodes
    this.raycaster.setFromCamera(this.mouse, this.camera);

    let hitFile = null;
    if (this.fileInstancedMesh) {
      const fileHits = this.raycaster.intersectObject(this.fileInstancedMesh);
      if (fileHits.length > 0 && typeof fileHits[0].instanceId === "number") {
        hitFile = this.fileNodesByIndex[fileHits[0].instanceId] || null;
      }
    }

    if (hitFile) {
      if (this.hoveredFileNode !== hitFile) {
        this.hoveredFileNode = hitFile;
        document.body.style.cursor = "pointer";
      }
      this.onFileHover(hitFile, { clientX: this.mouseClientX, clientY: this.mouseClientY });
    } else {
      if (this.hoveredFileNode) {
        this.hoveredFileNode = null;
        this.onFileHover(null);
      }

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
    }

    // Animate 3D Agent Quantum Drones
    for (const [claimId, drone] of this.agentDrones.entries()) {
      if (drone.isWarpingOut) {
        drone.scale = Math.max(0, drone.scale - 0.04);
        drone.group.scale.set(drone.scale, drone.scale, drone.scale);
        drone.group.position.y += 0.4;
        if (drone.scannerLine) drone.scannerLine.material.opacity = drone.scale * 0.8;
        if (drone.scale <= 0.01) {
          this.disposeDrone(drone);
          this.agentDrones.delete(claimId);
        }
      } else {
        drone.scale = Math.min(1.0, drone.scale + 0.04);
        drone.group.scale.set(drone.scale, drone.scale, drone.scale);

        // Kinetic orbit around zone center
        drone.orbitAngle += drone.orbitSpeed;
        const dX = drone.zonePos.x + Math.cos(drone.orbitAngle) * drone.orbitRadius;
        const dZ = drone.zonePos.z + Math.sin(drone.orbitAngle) * drone.orbitRadius;
        const dY = drone.zonePos.y + 10 + Math.sin(t * 3.5) * 1.6;
        drone.group.position.set(dX, dY, dZ);

        // Core and shield rotations
        drone.coreMesh.rotation.y += 0.035;
        drone.coreMesh.rotation.x += 0.02;
        drone.shieldMesh.rotation.y -= 0.045;
        drone.shieldMesh.rotation.z += 0.025;
        drone.droneLight.intensity = 1.4 + Math.sin(t * 8.0) * 0.5;

        // Dynamic laser scanner line
        if (drone.scannerLine) {
          const scanArr = drone.scannerLine.geometry.attributes.position.array;
          scanArr[0] = dX;
          scanArr[1] = dY;
          scanArr[2] = dZ;

          if (drone.isTargetingFile && drone.targetPos) {
            if (now > drone.targetTimer) {
              drone.isTargetingFile = false;
            } else {
              scanArr[3] = drone.targetPos.x;
              scanArr[4] = drone.targetPos.y;
              scanArr[5] = drone.targetPos.z;
              drone.scannerLine.geometry.attributes.position.needsUpdate = true;
              drone.scannerLine.material.opacity = 0.85 + Math.sin(t * 14.0) * 0.15;
              drone.scannerLine.visible = true;
            }
          }

          if (!drone.isTargetingFile) {
            // Sweeping scan cone over the zone soma
            const sweepX = drone.zonePos.x + Math.sin(t * 3.0) * 4.0;
            const sweepZ = drone.zonePos.z + Math.cos(t * 3.0) * 4.0;
            scanArr[3] = sweepX;
            scanArr[4] = drone.zonePos.y;
            scanArr[5] = sweepZ;
            drone.scannerLine.geometry.attributes.position.needsUpdate = true;
            drone.scannerLine.material.opacity = 0.45 + Math.sin(t * 5.0) * 0.2;
            drone.scannerLine.visible = true;
          }
        }
      }
    }

    // Animate expanding Risk Blast Radius shockwaves
    for (let i = this.blastShockwaves.length - 1; i >= 0; i--) {
      const sw = this.blastShockwaves[i];
      const elapsed = now - sw.startTime;
      const progress = elapsed / sw.durationMs;

      if (progress >= 1.0) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.blastShockwaves.splice(i, 1);
        continue;
      }

      const scale = 1.0 + Math.pow(progress, 0.45) * sw.maxScale;
      sw.mesh.scale.set(scale, scale, scale);
      sw.mesh.material.opacity = Math.pow(1.0 - progress, 1.2) * 0.85;
    }

    // Gradual thermodynamic heat decay
    for (const [k, v] of this.fileHeatMap.entries()) {
      const nv = v - 0.0008;
      if (nv <= 0.02) this.fileHeatMap.delete(k);
      else this.fileHeatMap.set(k, nv);
    }
    for (const [k, v] of this.zoneHeatMap.entries()) {
      const nv = v - 0.0015;
      if (nv <= 0.02) this.zoneHeatMap.delete(k);
      else this.zoneHeatMap.set(k, nv);
    }

    // Agent Follow Camera tracking
    if (!this.cameraAnimation && this.cameraMode === 1) {
      const activeDrones = Array.from(this.agentDrones.values()).filter((d) => !d.isWarpingOut);
      if (activeDrones.length > 0) {
        const drone = activeDrones[0];
        const dPos = drone.group.position;
        const desiredPos = new THREE.Vector3(dPos.x + 22, dPos.y + 14, dPos.z + 32);
        this.camera.position.lerp(desiredPos, 0.035);
        this.controls.target.lerp(dPos, 0.045);
      }
    }

    this.controls.update();
    if (this.enableBloom && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
