import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ZONE_POSITIONS, COLOR_MAP } from "./topology-layout.js";

export { ZONE_POSITIONS, COLOR_MAP };

export const DRONE_PALETTES = [
  { name: "cyber-green", hex: 0x00ff88, labelBorder: "#00ff88", labelText: "#a7f3d0", labelBg: "rgba(5, 46, 22, 0.94)" },
  { name: "hyper-red", hex: 0xff0055, labelBorder: "#ff0055", labelText: "#fecdd3", labelBg: "rgba(59, 7, 24, 0.94)" },
  { name: "neon-purple", hex: 0xc026d3, labelBorder: "#c026d3", labelText: "#f5d0fe", labelBg: "rgba(59, 7, 100, 0.94)" },
  { name: "solar-gold", hex: 0xffd000, labelBorder: "#ffd000", labelText: "#fef08a", labelBg: "rgba(66, 32, 6, 0.94)" },
  { name: "electric-blue", hex: 0x0070f3, labelBorder: "#0070f3", labelText: "#bfdbfe", labelBg: "rgba(15, 23, 42, 0.94)" },
  { name: "plasma-cyan", hex: 0x00f7ff, labelBorder: "#00f7ff", labelText: "#a5f3fc", labelBg: "rgba(8, 47, 73, 0.94)" },
  { name: "blaze-orange", hex: 0xff6600, labelBorder: "#ff6600", labelText: "#fed7aa", labelBg: "rgba(67, 20, 7, 0.94)" },
  { name: "hot-pink", hex: 0xff007f, labelBorder: "#ff007f", labelText: "#fbcfe8", labelBg: "rgba(80, 7, 36, 0.94)" },
];
let droneColorCounter = 0;

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
    this.fileNodesByZone = new Map(); // zoneId -> array of fileNodes
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
    this.hologramBadges = [];
    this.microHalos = [];
    this.badgeSideToggle = 0;
    this.heatmapMode = false;
    this.cameraMode = 0; // 0: orbit, 1: agent_follow, 2: top_down, 3: cockpit
    this.agentDrones = new Map(); // claimId/droneKey -> droneObject
    this.claimColorThemeMap = new Map(); // claimId -> droneTheme
    this.claimColorThemeCounter = 0;
    this.fileHeatMap = new Map(); // path -> heatNumber (0.0 - 3.0)
    this.zoneHeatMap = new Map(); // zoneId -> heatNumber (0.0 - 5.0)
    this.batchEventQueue = new Map(); // zoneId -> array of events
    this.batchFlushTimers = new Map();
    this.ambientBeams = [];
    this.nextAmbientWaveTime = 0;

    this.initScene();
    this.initLights();
    this.initStarfield();
    this.initControls();
    this.initEvents();
    this.initAmbientBeams();
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

    // 3. Build Organic Layer Cluster Tendrils (Connecting Intra-Layer Nodes)
    // Ensures zero disconnected nodes; unifies the brain into a cohesive network.
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
    this.fileNodesByZone.clear();

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
        if (!this.fileNodesByZone.has(zoneId)) {
          this.fileNodesByZone.set(zoneId, []);
        }
        this.fileNodesByZone.get(zoneId).push(fileNode);

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
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dendriteLineSegments = new THREE.LineSegments(dendriteGeo, dendriteMat);
    this.scene.add(this.dendriteLineSegments);

    // Initialize active Cyber Drone fleet immediately so drones fly from the very first frame
    this.updateAgentDrones();

    // Schedule initial wave of ambient synaptic light beams
    this.nextAmbientWaveTime = performance.now() + 1000;
  }

  findFileNodeByName(fileName) {
    if (!fileName) return null;
    for (const node of this.fileNodes.values()) {
      if (node.name === fileName) return node;
    }
    return null;
  }

  spawnMicroHalo(pos) {
    const haloColor = 0xff2244; // Radiant Cyber Red
    const ringGeo = new THREE.RingGeometry(0.165, 0.246, 32);
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

    let strokeColor = "#ff2244";
    let textColor = "#fca5a5";
    let prefix = "⚡ ";
    let bgColor = "rgba(36, 8, 14, 0.94)";

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
    // Scaled down to 30% of previous dimensions for compact, high signal-to-noise display
    sprite.scale.set(2.0, 0.48, 1);
    const startY = pos.y + 0.8;
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
    const horizontalOffset = sideSign * 6.0; // Compact 12 units separation between Left and Right
    const targetHeight = 6.0 + tier * 4.0; // Compact 4 units vertical gap between tiers

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
      this.updateAgentDrones(state.claims || [], state.zones || []);
      return;
    }

    const activeZoneIds = new Set(state.zones.filter((z) => z.status === "active").map((z) => z.id));

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

      if (axon.particles) {
        for (const p of axon.particles) {
          p.mesh.material.color.setHex(pColor);
          p.mesh.scale.set(pScale, pScale * 1.5, pScale);
          p.speed = pSpeed + Math.random() * 0.001;
        }
      }
    }

    // Synchronize 3D Agent Cyber Drones (always active, multi-zone per claim)
    this.updateAgentDrones(state.claims || [], state.zones || []);
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
        // Safe: emerald green glow
        node.coreMesh.material.color.setHex(0x10b981);
        node.coreMesh.material.emissive.setHex(0x10b981);
        node.coreMesh.material.emissiveIntensity = 1.0;
        node.coreMesh.material.transparent = false;
        node.coreMesh.material.opacity = 1.0;
        node.latticeMesh.material.color.setHex(0x10b981);
        node.latticeMesh.material.opacity = 0.5;
        node.gyroRing1.material.color.setHex(0x10b981);
        node.gyroRing2.material.color.setHex(0x10b981);
        node.labelSprite.material.opacity = 0.9;
      } else {
        // Conflicting: dim red/slate
        node.coreMesh.material.color.setHex(0x334155);
        node.coreMesh.material.emissive.setHex(0xef4444);
        node.coreMesh.material.emissiveIntensity = 0.2;
        node.coreMesh.material.transparent = true;
        node.coreMesh.material.opacity = 0.35;
        node.latticeMesh.material.color.setHex(0x334155);
        node.latticeMesh.material.opacity = 0.1;
        node.gyroRing1.material.color.setHex(0x334155);
        node.gyroRing2.material.color.setHex(0x334155);
        node.labelSprite.material.opacity = 0.3;
      }
    }

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

  clearSafeZoneHighlights() {
    this.safeZoneMode = null;
    for (const node of this.nodeMeshes.values()) {
      node.coreMesh.material.transparent = false;
      node.coreMesh.material.opacity = 1.0;
      node.latticeMesh.material.opacity = 0.35;
      node.gyroRing1.material.opacity = 0.45;
      node.gyroRing2.material.opacity = 0.35;
      node.labelSprite.material.opacity = 1.0;
    }
    for (const axon of this.axonLines) {
      if (axon.particles) {
        for (const p of axon.particles) {
          p.mesh.visible = true;
        }
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

  initAmbientBeams() {
    this.ambientBeams = [];
    // Pre-allocate 5 reusable beam objects (pool for 3-5 concurrent staggered beams)
    for (let i = 0; i < 5; i++) {
      const headGeo = new THREE.SphereGeometry(0.42, 8, 8);
      const headMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.visible = false;
      this.scene.add(headMesh);

      const tailSegments = 16;
      const tailGeo = new THREE.BufferGeometry();
      const tailPositions = new Float32Array(tailSegments * 3);
      tailGeo.setAttribute("position", new THREE.BufferAttribute(tailPositions, 3));
      const tailMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const tailLine = new THREE.Line(tailGeo, tailMat);
      tailLine.visible = false;
      this.scene.add(tailLine);

      this.ambientBeams.push({
        headMesh,
        tailLine,
        tailSegments,
        active: false,
        launchTime: 0,
        duration: 1300,
        axon: null,
        reverse: false,
        tailLength: 0.22,
      });
    }
  }

  scheduleAmbientBeamWave(now) {
    if (!this.axonLines || this.axonLines.length === 0) return;

    // Pick 3 to 5 random distinct connection lines (axons)
    const count = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
    const available = [...this.axonLines];
    const chosenAxons = [];

    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      chosenAxons.push(available.splice(idx, 1)[0]);
    }

    // Schedule each beam with non-simultaneous staggered launch (0.2s - 0.7s gap)
    let currentLaunchTime = now;
    for (let i = 0; i < chosenAxons.length; i++) {
      if (i > 0) {
        // Stagger between 0.2s (200ms) and 0.7s (700ms) strictly adhering to user requirement
        const staggerMs = 200 + Math.random() * 500;
        currentLaunchTime += staggerMs;
      }

      const beam = this.ambientBeams[i];
      beam.active = true;
      beam.axon = chosenAxons[i];
      beam.launchTime = currentLaunchTime;
      beam.duration = 1200 + Math.random() * 500; // 1.2s - 1.7s traversal time
      beam.reverse = Math.random() > 0.5; // Random transmission direction
      beam.headMesh.visible = false;
      beam.tailLine.visible = false;
    }

    // Schedule next wave after the final beam has finished traversing + random rest interval (2.0s - 4.5s)
    const lastBeamDuration = this.ambientBeams[chosenAxons.length - 1]?.duration || 1400;
    const waveCompletionTime = currentLaunchTime + lastBeamDuration;
    const waveRestMs = 2000 + Math.random() * 2500;
    this.nextAmbientWaveTime = waveCompletionTime + waveRestMs;
  }

  animateAmbientBeams(now) {
    if (!this.axonLines || this.axonLines.length === 0) return;

    // Check if it's time to trigger the next ambient wave
    if (now >= this.nextAmbientWaveTime) {
      this.scheduleAmbientBeamWave(now);
    }

    for (let i = 0; i < this.ambientBeams.length; i++) {
      const beam = this.ambientBeams[i];
      if (!beam.active || !beam.axon || !beam.axon.curve) continue;

      // Waiting for staggered launch time
      if (now < beam.launchTime) {
        beam.headMesh.visible = false;
        beam.tailLine.visible = false;
        continue;
      }

      const elapsed = now - beam.launchTime;
      const progress = elapsed / beam.duration;

      if (progress >= 1.0) {
        // Beam reached destination
        beam.active = false;
        beam.headMesh.visible = false;
        beam.tailLine.visible = false;

        // Subtle synaptic energy ripple at destination zone node
        const arrivalZoneId = beam.reverse ? beam.axon.source : beam.axon.target;
        const node = this.nodeMeshes.get(arrivalZoneId);
        if (node && node.excitation < 0.25) {
          node.excitation = Math.max(node.excitation, 0.2);
        }
        continue;
      }

      const headT = beam.reverse ? 1.0 - progress : progress;
      const curve = beam.axon.curve;
      const headPos = curve.getPoint(headT);

      // Smooth opacity ramp: fade in at start, fade out at end
      let alpha = 1.0;
      if (progress < 0.12) {
        alpha = progress / 0.12;
      } else if (progress > 0.88) {
        alpha = (1.0 - progress) / 0.12;
      }

      // Update head mesh
      beam.headMesh.position.copy(headPos);
      beam.headMesh.material.opacity = alpha * 0.95;
      beam.headMesh.visible = true;

      // Update trailing streak line
      beam.tailLine.visible = true;
      beam.tailLine.material.opacity = alpha * 0.85;

      const tailLength = beam.tailLength;
      const tailPosArr = beam.tailLine.geometry.attributes.position.array;
      const numPts = beam.tailSegments;

      for (let j = 0; j < numPts; j++) {
        const frac = j / (numPts - 1); // 0 (tail tip) to 1 (head)
        let ptT;
        if (beam.reverse) {
          ptT = Math.min(1.0, Math.max(0.0, headT + (1.0 - frac) * tailLength));
        } else {
          ptT = Math.max(0.0, Math.min(1.0, headT - (1.0 - frac) * tailLength));
        }
        const pt = curve.getPoint(ptT);
        const idx = j * 3;
        tailPosArr[idx] = pt.x;
        tailPosArr[idx + 1] = pt.y;
        tailPosArr[idx + 2] = pt.z;
      }
      beam.tailLine.geometry.attributes.position.needsUpdate = true;
    }
  }

  updateAgentDrones(claims = [], zones = []) {
    const activeTargets = [];
    const activeKeys = new Set();

    // 1. Identify real active claims from claims list (1 drone per claim with multi-sphere waypoints)
    if (claims && claims.length > 0) {
      for (const claim of claims) {
        if (claim.status && claim.status !== "active") continue;
        const writeZones = claim.writeZones && claim.writeZones.length > 0 ? claim.writeZones : ["shared-contracts"];
        const readZones = claim.readStableZones || [];

        // Build ordered list of duty waypoints for this claim: active write zones first, then read-stable dependencies
        const dutyWaypoints = [];
        const seenZones = new Set();

        for (const zoneId of writeZones) {
          if (!seenZones.has(zoneId) && ZONE_POSITIONS[zoneId]) {
            seenZones.add(zoneId);
            dutyWaypoints.push({
              zoneId,
              pos: ZONE_POSITIONS[zoneId],
              type: "active",
            });
          }
        }

        for (const zoneId of readZones) {
          if (!seenZones.has(zoneId) && ZONE_POSITIONS[zoneId]) {
            seenZones.add(zoneId);
            dutyWaypoints.push({
              zoneId,
              pos: ZONE_POSITIONS[zoneId],
              type: "read_stable",
            });
          }
        }

        if (dutyWaypoints.length === 0) {
          dutyWaypoints.push({
            zoneId: "shared-contracts",
            pos: ZONE_POSITIONS["shared-contracts"] || { x: 0, y: 0, z: 0, radius: 4 },
            type: "active",
          });
        }

        // Color theme is unified per claim: all drones belonging to the same claim share the EXACT same color!
        if (!this.claimColorThemeMap.has(claim.id)) {
          const themeIndex = this.claimColorThemeCounter++ % DRONE_PALETTES.length;
          this.claimColorThemeMap.set(claim.id, DRONE_PALETTES[themeIndex]);
        }
        const claimTheme = this.claimColorThemeMap.get(claim.id);

        // Multi-drone squadron calculation: at least 1 drone, plus 1 drone for every 2 red/yellow spheres (e.g. 2 -> 1, 4 -> 2)
        const droneCount = Math.max(1, Math.floor(dutyWaypoints.length / 2));

        for (let dIndex = 0; dIndex < droneCount; dIndex++) {
          const droneKey = droneCount === 1 ? claim.id : `${claim.id}#${dIndex + 1}`;
          const agentLabel = droneCount === 1 ? claim.agent || "Agent" : `${claim.agent || "Agent"} [${dIndex + 1}/${droneCount}]`;
          const startingWpIndex = (dIndex * Math.floor(dutyWaypoints.length / droneCount)) % dutyWaypoints.length;

          if (!activeKeys.has(droneKey)) {
            activeKeys.add(droneKey);
            activeTargets.push({
              id: droneKey,
              claimId: claim.id,
              agentName: agentLabel,
              droneTheme: claimTheme,
              dutyWaypoints,
              initialWaypointIndex: startingWpIndex,
              plannedFiles: claim.plannedFiles || [],
            });
          }
        }
      }
    }

    // 2. Cross-reference zones with active writers or active status
    if (zones && zones.length > 0) {
      for (const z of zones) {
        if (z.status === "active") {
          if (z.writers && z.writers.length > 0) {
            for (const w of z.writers) {
              const droneKey = w.id;
              if (!activeKeys.has(droneKey)) {
                activeKeys.add(droneKey);
                if (!this.claimColorThemeMap.has(w.id)) {
                  const themeIndex = this.claimColorThemeCounter++ % DRONE_PALETTES.length;
                  this.claimColorThemeMap.set(w.id, DRONE_PALETTES[themeIndex]);
                }
                const claimTheme = this.claimColorThemeMap.get(w.id);
                const wp = [
                  {
                    zoneId: z.id,
                    pos: ZONE_POSITIONS[z.id] || { x: 0, y: 0, z: 0, radius: 4 },
                    type: "active",
                  },
                ];
                activeTargets.push({
                  id: droneKey,
                  claimId: w.id,
                  agentName: w.agent || "Agent",
                  droneTheme: claimTheme,
                  dutyWaypoints: wp,
                  initialWaypointIndex: 0,
                  plannedFiles: w.plannedFiles || [],
                });
              }
            }
          } else {
            // Zone has active status from claim, guarantee drone presence!
            const droneKey = `zone-active:${z.id}`;
            if (!activeKeys.has(droneKey)) {
              activeKeys.add(droneKey);
              if (!this.claimColorThemeMap.has(droneKey)) {
                const themeIndex = this.claimColorThemeCounter++ % DRONE_PALETTES.length;
                this.claimColorThemeMap.set(droneKey, DRONE_PALETTES[themeIndex]);
              }
              const claimTheme = this.claimColorThemeMap.get(droneKey);
              const wp = [
                {
                  zoneId: z.id,
                  pos: ZONE_POSITIONS[z.id] || { x: 0, y: 0, z: 0, radius: 4 },
                  type: "active",
                },
              ];
              activeTargets.push({
                id: droneKey,
                claimId: `claim-${z.id}`,
                agentName: "Agent",
                droneTheme: claimTheme,
                dutyWaypoints: wp,
                initialWaypointIndex: 0,
                plannedFiles: [],
              });
            }
          }
        }
      }
    }

    // 3. Update existing drones or create new ones for each active claim
    for (const target of activeTargets) {
      let drone = this.agentDrones.get(target.id);
      if (!drone) {
        drone = this.createAgentDrone(target);
        this.agentDrones.set(target.id, drone);
      } else {
        drone.plannedFiles = target.plannedFiles || [];
        if (target.dutyWaypoints && target.dutyWaypoints.length > 0) {
          drone.dutyWaypoints = target.dutyWaypoints;
          if (!drone.dutyWaypoints.some((wp) => wp.zoneId === drone.currentZoneId)) {
            drone.waypointIndex = 0;
            drone.currentWaypoint = drone.dutyWaypoints[0];
            drone.currentZoneId = drone.currentWaypoint.zoneId;
            drone.zonePos = drone.currentWaypoint.pos;
          }
        }
        if (drone.isWarpingOut) {
          drone.isWarpingOut = false;
        }
      }
    }

    // 5. Warp out any drones that are no longer in activeKeys
    for (const [key, drone] of this.agentDrones.entries()) {
      if (!activeKeys.has(key) && !drone.isWarpingOut) {
        drone.isWarpingOut = true;
        drone.warpStartTime = performance.now();
      }
    }
  }

  createAgentDrone(info) {
    const droneGroup = new THREE.Group();
    const dutyWaypoints =
      info.dutyWaypoints && info.dutyWaypoints.length > 0
        ? info.dutyWaypoints
        : [
            {
              zoneId: info.targetZoneId || "agent-coordination",
              pos: ZONE_POSITIONS[info.targetZoneId || "agent-coordination"] || { x: 0, y: 0, z: 0, radius: 4 },
              type: "active",
            },
          ];
    const initialIndex =
      info.initialWaypointIndex !== undefined && info.initialWaypointIndex < dutyWaypoints.length ? info.initialWaypointIndex : 0;
    const initialWaypoint = dutyWaypoints[initialIndex];
    const zonePos = initialWaypoint.pos;
    const targetZoneId = initialWaypoint.zoneId;
    const agentName = info.agentName || info.agent || "Agent";
    const claimId = info.claimId || info.id || `claim-${targetZoneId}`;
    const droneKey = info.id || `${claimId}:${targetZoneId}`;

    const initAngle = Math.random() * Math.PI * 2;
    const initRadius = (zonePos.radius || 4) * 2.2 + 5.5 + Math.random() * 2.5;
    droneGroup.position.set(
      zonePos.x + Math.cos(initAngle) * initRadius,
      zonePos.y + 7.5 + (Math.random() - 0.5) * 4.0,
      zonePos.z + Math.sin(initAngle) * initRadius,
    );
    droneGroup.scale.set(0.01, 0.01, 0.01);

    // Subgroup containing all articulating drone body meshes
    // Pitch/roll/yaw rotations are applied here so tagSprite stays upright and facing camera
    const modelGroup = new THREE.Group();
    // Balanced sentinel scale: prominent, compact, clean visual hierarchy
    modelGroup.scale.set(1.4, 1.4, 1.4);
    droneGroup.add(modelGroup);

    // =========================================================================
    // PROCEDURAL 3D ROBOT SENTINEL (6-LEGGED HEXAPOD ORB, MULTI-SPECTRUM PALETTE)
    // =========================================================================
    const droneMeshes = [];
    const accentTrimMeshes = [];

    // Assign unique cyber neon color theme per claim (unified for drones in same claim, distinct across claims)
    const droneTheme = info.droneTheme || DRONE_PALETTES[droneColorCounter++ % DRONE_PALETTES.length];

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
    const coreGroup = new THREE.Group();
    modelGroup.add(coreGroup);

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

    // Front Ocular Visor / Eye Assembly (At +Z face)
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(0, 0.05, 0.85);
    coreGroup.add(eyeGroup);

    // Dark recessed bevel cavity
    const bezelGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.22, 32);
    bezelGeo.rotateX(Math.PI / 2);
    const bezelMesh = new THREE.Mesh(bezelGeo, darkMetalMat);
    eyeGroup.add(bezelMesh);
    droneMeshes.push(bezelMesh);

    // Outer glowing cyan ring
    const eyeRingGeo = new THREE.TorusGeometry(0.52, 0.042, 16, 36);
    const eyeRingMesh = new THREE.Mesh(eyeRingGeo, eyeRingMat);
    eyeRingMesh.position.set(0, 0, 0.1);
    eyeGroup.add(eyeRingMesh);
    droneMeshes.push(eyeRingMesh);
    accentTrimMeshes.push(eyeRingMesh);

    // Luminous cyan pupil core
    const pupilGeo = new THREE.SphereGeometry(0.36, 24, 20);
    const pupilMesh = new THREE.Mesh(pupilGeo, pupilMat);
    pupilMesh.scale.set(1.0, 1.0, 0.3);
    pupilMesh.position.set(0, 0, 0.1);
    eyeGroup.add(pupilMesh);
    droneMeshes.push(pupilMesh);

    // Stylized ocular reflection highlights (Crescent + dot in upper-left)
    const highlightGeo1 = new THREE.BoxGeometry(0.12, 0.065, 0.02);
    const highlight1 = new THREE.Mesh(highlightGeo1, eyeHighlightMat);
    highlight1.position.set(-0.13, 0.14, 0.18);
    highlight1.rotation.z = -0.35;
    eyeGroup.add(highlight1);
    droneMeshes.push(highlight1);

    const highlightGeo2 = new THREE.SphereGeometry(0.028, 8, 8);
    const highlight2 = new THREE.Mesh(highlightGeo2, eyeHighlightMat);
    highlight2.position.set(-0.18, 0.05, 0.18);
    eyeGroup.add(highlight2);
    droneMeshes.push(highlight2);

    // Dedicated Pure White Local Fill Light on Sentinel Core
    const coreFillLight = new THREE.PointLight(0xffffff, 2.4, 20);
    coreFillLight.position.set(0, 0.2, 1.2);
    coreGroup.add(coreFillLight);

    // Bottom anti-grav thruster / stabilization field
    const antiGravGeo = new THREE.TorusGeometry(0.36, 0.045, 16, 32);
    antiGravGeo.rotateX(Math.PI / 2);
    const antiGravGlow = new THREE.Mesh(antiGravGeo, eyeRingMat.clone());
    antiGravGlow.position.set(0, -0.98, 0);
    coreGroup.add(antiGravGlow);
    droneMeshes.push(antiGravGlow);

    // -------------------------------------------------------------------------
    // CHARGING ENERGY PLASMA ORB (Synthesizes in front of eye for 2.0 seconds)
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // COLOSSAL VOLUMETRIC MEGA-BEAM (Concentric cylinders in world scene)
    // -------------------------------------------------------------------------
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

    this.scene.add(megaBeamGroup);

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
    this.scene.add(megaImpactFlare);

    // =========================================================================
    // 6 ARTICULATED MECHANICAL LEGS (3 LEFT, 3 RIGHT) - PERFECT BILATERAL SYMMETRY
    // =========================================================================
    const legConfigs = [
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

    const legs = [];

    for (let i = 0; i < legConfigs.length; i++) {
      const cfg = legConfigs[i];
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

      // 6. Mechanical Claw / Pincer (Dual-prong Gripper with Laser Muzzle)
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

      // 7. Pre-allocated Green Laser Plasma Projectile Bullet Pool (Strictly Green!)
      const bulletPool = [];
      for (let b = 0; b < 6; b++) {
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

        this.scene.add(bulletGroup);

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
        this.scene.add(impactFlare);

        bulletPool.push({
          bulletGroup,
          bulletOuterMesh,
          bulletCoreMesh,
          impactFlare,
        });
      }

      legs.push({
        index: i,
        cfg,
        isLeft,
        legRootGroup,
        upperBoneGroup,
        elbowGroup,
        forearmGroup,
        wristGroup,
        clawGroup,
        muzzleMesh,
        emitterMarker,
        bulletPool,
        shoulderPitch: cfg.shoulderPitch,
        kneeBend: cfg.kneeBend,
        salvo: null,
      });
    }

    // Drone PointLight: Themed Sentinel Glow
    const droneLight = new THREE.PointLight(droneTheme.hex, 2.6, 45);
    droneLight.position.set(0, 0.4, 0.6);
    droneGroup.add(droneLight);

    // Drone Agent Hologram Tag
    const tagSprite = this.createAgentLabelSprite(agentName, droneTheme);
    tagSprite.position.set(0, 2.8, 0);
    tagSprite.scale.set(3.8, 0.95, 1);
    droneGroup.add(tagSprite);

    this.scene.add(droneGroup);

    const planned = info.plannedFiles || [];
    return {
      claimId,
      droneKey,
      agentName,
      dutyWaypoints,
      currentWaypoint: initialWaypoint,
      currentZoneId: targetZoneId,
      zonePos,
      group: droneGroup,
      modelGroup,
      coreGroup,
      eyeGroup,
      pupilMesh,
      legs,
      droneMeshes,
      accentTrimMeshes,
      antiGravGlow,
      droneLight,
      tagSprite,
      chargingOrbGroup,
      orbCoreMesh,
      orbShellMesh,
      accretionRing1,
      accretionRing2,
      megaBeamGroup,
      megaOuterMat,
      megaCoreMat,
      megaImpactFlare,
      droneTheme,
      chargeDuration: 2000,
      blastDuration: 450,
      plannedFiles: planned,
      plannedFileIndex: 0,
      scale: 0.01,
      targetScale: 1.4,
      isWarpingOut: false,
      warpStartTime: 0,

      // Organic 3D Free-Patrol Kinematics (Independent random kinematics per drone)
      wanderAngle: initAngle,
      baseWanderSpeed: 0.007 + Math.random() * 0.006,
      orbitDirection: Math.random() > 0.5 ? 1 : -1,
      orbitRadius: initRadius,
      seedR: Math.random() * Math.PI * 2,
      seedY: Math.random() * Math.PI * 2,
      seedPhase: Math.random() * 100,

      // Patrol cycle counters (reduced to 2 full patrol + laser cycles per sphere before transit)
      patrolCyclesAtSphere: Math.floor(Math.random() * 2), // Staggered cycle start so drones don't transit at the exact same moment
      maxPatrolCyclesAtSphere: 2,

      // 5-Phase State Machine: 0: PATROL, 1: LASER_SALVO, 2: TRANSIT, 3: EYE_CHARGE (2s), 4: MEGA_BLAST (450ms)
      droneState: 0,
      stateStartTime: performance.now() - Math.random() * 1500, // Staggered elapsed time for organic desynchronization
      patrolDuration: 1800 + Math.random() * 1400,
      laserDuration: 2400,
      hoverPos: new THREE.Vector3(
        zonePos.x + Math.cos(initAngle) * initRadius,
        zonePos.y + 7.5 + (Math.random() - 0.5) * 4.0,
        zonePos.z + Math.sin(initAngle) * initRadius,
      ),

      // Inter-sphere transit kinematics (50% speed = ~4800-9000ms duration)
      transitStartTime: 0,
      transitDuration: 5500,
      transitStartPos: new THREE.Vector3(),
      transitTargetPos: new THREE.Vector3(),
      nextWaypoint: null,
      waypointIndex: initialIndex,

      // Target Coordinates (Strictly scoped within current zone)
      targetPos: new THREE.Vector3(zonePos.x, zonePos.y, zonePos.z),
      targetZoneId: targetZoneId,
      isTargetingFile: false,
      targetTimer: 0,
    };
  }

  createAgentLabelSprite(agentName, theme = null) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    const strokeColor = theme?.labelBorder || "#00f7ff";
    const textColor = theme?.labelText || "#a5f3fc";
    const bgColor = theme?.labelBg || "rgba(10, 20, 40, 0.94)";

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3.0;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 14;
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(4, 4, 248, 56, 14);
    } else {
      ctx.rect(4, 4, 248, 56);
    }
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = "bold 22px 'JetBrains Mono', monospace";
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const displayName = agentName.length > 14 ? agentName.slice(0, 12) + "…" : agentName;
    ctx.fillText(`🤖 ${displayName}`, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMat);
    // Compact tag size that doesn't dwarf the drone model
    sprite.scale.set(4.5, 1.15, 1);
    return sprite;
  }

  disposeDrone(drone) {
    if (!drone) return;
    this.scene.remove(drone.group);

    // Dispose all procedural meshes in the drone model
    if (drone.droneMeshes) {
      for (const m of drone.droneMeshes) {
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material.dispose();
          }
        }
      }
    }

    if (drone.tagSprite) {
      if (drone.tagSprite.material?.map) drone.tagSprite.material.map.dispose();
      drone.tagSprite.material?.dispose();
    }

    if (drone.legs) {
      for (const leg of drone.legs) {
        if (leg.bulletPool) {
          for (const bp of leg.bulletPool) {
            if (bp.bulletGroup) {
              this.scene.remove(bp.bulletGroup);
              if (bp.bulletOuterMesh?.geometry) bp.bulletOuterMesh.geometry.dispose();
              if (bp.bulletOuterMesh?.material) bp.bulletOuterMesh.material.dispose();
              if (bp.bulletCoreMesh?.geometry) bp.bulletCoreMesh.geometry.dispose();
              if (bp.bulletCoreMesh?.material) bp.bulletCoreMesh.material.dispose();
            }
            if (bp.impactFlare) {
              this.scene.remove(bp.impactFlare);
              if (bp.impactFlare.geometry) bp.impactFlare.geometry.dispose();
              if (bp.impactFlare.material) bp.impactFlare.material.dispose();
            }
          }
        }
      }
    }

    if (drone.megaBeamGroup) {
      this.scene.remove(drone.megaBeamGroup);
      drone.megaBeamGroup.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
    }

    if (drone.megaImpactFlare) {
      this.scene.remove(drone.megaImpactFlare);
      if (drone.megaImpactFlare.geometry) drone.megaImpactFlare.geometry.dispose();
      if (drone.megaImpactFlare.material) drone.megaImpactFlare.material.dispose();
    }
  }

  syncDroneOrbitFromCurrentPos(drone) {
    if (!drone || !drone.zonePos) return;
    const dx = drone.group.position.x - drone.zonePos.x;
    const dz = drone.group.position.z - drone.zonePos.z;
    drone.wanderAngle = Math.atan2(dz, dx);
    const curR = Math.hypot(dx, dz);
    const minR = (drone.zonePos.radius || 4) * 2.2 + 5.0;
    drone.orbitRadius = Math.max(minR, curR);
  }

  triggerFileActivity(activity) {
    if (!activity || !activity.zoneId) return;

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
      const zonePos = zoneNode ? zoneNode.group.position : ZONE_POSITIONS[zoneId] || { x: 0, y: 0, z: 0 };
      const zoneName = zoneNode?.zone?.name || zoneId;

      this.spawnHologramBadgeAtPos(zonePos, `${activities.length} files in ${zoneName}`, "change", agentName, true);

      // Trigger zone excitation for the batch
      if (zoneNode) {
        zoneNode.excitation = 1.0;
        zoneNode.lastSpikeTime = performance.now();
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
    const { zoneId, file, fileName, eventType, agent } = activity;

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
      setTimeout(
        () => {
          zoneNode.excitation = 1.0;
          zoneNode.lastSpikeTime = performance.now();
        },
        fileNode ? 180 : 0,
      );

      if (!fileNode) {
        this.spawnHologramBadgeAtPos(zoneNode.group.position, fileName || "file", eventType || "change", agent, false);
      }
    }
  }

  exciteMicroNeuron(activity, spawnBadge = true) {
    const { file, fileName, eventType, agent } = activity;
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

      // Direct drone laser scanner toward this micro-neuron if drone exists for this agent
      // STRICTLY scoped to drone's current zone to eliminate cross-zone laser fire
      if (agent) {
        for (const drone of this.agentDrones.values()) {
          if (drone.agentName === agent && drone.currentZoneId === fileNode.zoneId) {
            drone.targetPos = fileNode.worldPos.clone();
            drone.targetZoneId = fileNode.zoneId;
            drone.isTargetingFile = true;
            drone.targetTimer = performance.now() + 12000;
          }
        }
      }
    }

    return fileNode;
  }

  animate(time) {
    requestAnimationFrame(this.animate);
    const now = time || performance.now();
    const t = now * 0.001;

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
      const isHovered = this.hoveredZoneId === id;

      if (isActive) {
        // === UNIQUE ACTIVE NODE ANIMATIONS (Clean & Steady) ===
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
      } else {
        // === IDLE / STANDARD NODE ANIMATIONS (Clean & Steady) ===
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

      // 8. Dynamic chromatic gradient surge triggered by drone mega-laser for 3.0s
      if (node.gradientSurge) {
        const surgeElapsed = now - node.gradientSurge.startTime;
        const surgeProgress = surgeElapsed / (node.gradientSurge.duration || 3000);
        if (surgeProgress < 1.0) {
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
        } else {
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
        }
      }
    }

    // Animate floating hologram badges: Deterministic tiered non-overlapping slots with horizontal drift & neon leader lines

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

      // Scaled down to 30% of previous dimensions (3.6x * scaleMult, 0.9y * scaleMult)
      let scaleMult;
      if (progress < 0.25) {
        const inProg = progress / 0.25;
        scaleMult = 1.0 + Math.pow(inProg, 0.6) * 2.0;
      } else if (progress < 0.75) {
        scaleMult = 3.0;
      } else {
        const exitProg = (progress - 0.75) / 0.25;
        scaleMult = 3.0 + exitProg * 0.35;
      }

      badge.sprite.scale.set(3.6 * scaleMult, 0.9 * scaleMult, 1);

      // Smooth fade out in the last 20%
      let opacity = 1.0;
      if (progress > 0.8) {
        opacity = (1.0 - progress) / 0.2;
      }
      badge.sprite.material.opacity = opacity;

      // Update glowing neon leader line from micro-neuron to badge bottom
      if (badge.leaderLine) {
        const linePos = badge.leaderLine.geometry.attributes.position.array;
        linePos[0] = badge.baseX;
        linePos[1] = badge.baseY;
        linePos[2] = badge.baseZ;
        linePos[3] = curX;
        linePos[4] = curY - 0.45 * scaleMult;
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

    // Animate axon conduit lines based on zone activity
    for (const axon of this.axonLines) {
      const isLineConnectedToHover = this.hoveredZoneId && (axon.source === this.hoveredZoneId || axon.target === this.hoveredZoneId);

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
      } else if (!this.safeZoneMode) {
        if (axon.conduit) {
          axon.conduit.material.opacity = 0.16;
        }
        axon.line.material.opacity = 0.24;
      }
    }

    // Animate ambient staggered synaptic light beams running through random axon conduits
    this.animateAmbientBeams(now);

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

      // 1. Precompute orbital rotation (cos, sin) for each of the 23 zones at current time t
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

        // Excitation Animation (10.0 seconds duration, fixed 1.0x scale, radiant cyber red)
        let scale = 1.0;
        const totalDurationMs = 10000;
        const elapsed = fileNode.lastSpikeTime > 0 ? now - fileNode.lastSpikeTime : Infinity;

        if (elapsed < totalDurationMs) {
          const progress = elapsed / totalDurationMs; // 0.0 to 1.0 over exactly 10 seconds
          fileNode.excitation = 1.0 - progress;
          needsColorUpdate = true;

          // Radiant Cyber Red & Vivid Crimson
          const cyberRed = new THREE.Color(0xff2244);
          const brightRed = new THREE.Color(0xef4444);

          if (progress < 0.12) {
            // Stage 1: Quick energetic flash with white-hot cyber red core, fixed 1.0x scale
            const inProg = progress / 0.12;
            const curColor = cyberRed.clone().lerp(whiteColor, (1.0 - inProg) * 0.75);
            this.fileInstancedMesh.setColorAt(fileNode.index, curColor);
            scale = 1.0;
          } else if (progress < 0.75) {
            // Stage 2: Sustained glowing cyber red at 1.0x scale
            this.fileInstancedMesh.setColorAt(fileNode.index, brightRed);
            scale = 1.0;
          } else {
            // Stage 3: Smooth energy dissipation from cyber red back to baseColor, fixed 1.0x scale
            const exitRatio = (1.0 - progress) / 0.25; // 1 down to 0
            const curColor = fileNode.baseColor.clone().lerp(cyberRed, exitRatio);
            this.fileInstancedMesh.setColorAt(fileNode.index, curColor);
            scale = 1.0;
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

        // High-Voltage Dendrite Surge in Cyber Red
        if (dendriteColArray) {
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

    // Animate 3D Agent Procedural Cyber Drones
    for (const [claimId, drone] of this.agentDrones.entries()) {
      if (drone.isWarpingOut) {
        drone.scale = Math.max(0, drone.scale - 0.06);
        drone.group.scale.set(drone.scale, drone.scale, drone.scale);
        drone.group.position.y += 0.3;
        if (drone.legs) {
          for (const leg of drone.legs) {
            if (leg.bulletPool) {
              for (const bp of leg.bulletPool) {
                bp.bulletGroup.visible = false;
                bp.impactFlare.visible = false;
              }
            }
          }
        }
        if (drone.scale <= 0.02) {
          this.disposeDrone(drone);
          this.agentDrones.delete(claimId);
        }
        continue;
      }

      drone.scale = Math.min(drone.targetScale || 1.4, drone.scale + 0.06);
      drone.group.scale.set(drone.scale, drone.scale, drone.scale);

      // Resolve current target coordinates STRICTLY within drone.currentZoneId
      const targetCoord = new THREE.Vector3(drone.zonePos.x, drone.zonePos.y, drone.zonePos.z);
      let hasSpecificTarget = false;

      // 1. Actively targeting a recently excited file strictly in THIS zone
      if (drone.isTargetingFile && drone.targetPos && drone.targetZoneId === drone.currentZoneId) {
        if (now > drone.targetTimer) {
          drone.isTargetingFile = false;
        } else {
          targetCoord.copy(drone.targetPos);
          hasSpecificTarget = true;
        }
      }

      // 2. Cycle through planned files belonging to THIS zone
      if (!hasSpecificTarget && drone.plannedFiles && drone.plannedFiles.length > 0) {
        const filesInThisZone = drone.plannedFiles.filter((f) => {
          const fn = this.fileNodes.get(f) || this.findFileNodeByName(f);
          return fn && fn.zoneId === drone.currentZoneId;
        });
        if (filesInThisZone.length > 0) {
          const fileKey = filesInThisZone[drone.plannedFileIndex % filesInThisZone.length];
          const fileNode = this.fileNodes.get(fileKey) || this.findFileNodeByName(fileKey);
          if (fileNode && fileNode.worldPos) {
            targetCoord.copy(fileNode.worldPos);
            hasSpecificTarget = true;
          }
        }
      }

      // 3. Fallback: inspect existing micro-neuron in this zone or surface diagnostic point
      if (!hasSpecificTarget) {
        const zoneFileNodes = this.fileNodesByZone ? this.fileNodesByZone.get(drone.currentZoneId) : null;
        if (zoneFileNodes && zoneFileNodes.length > 0) {
          const fn = zoneFileNodes[drone.plannedFileIndex % zoneFileNodes.length];
          if (fn && fn.worldPos) {
            targetCoord.copy(fn.worldPos);
            hasSpecificTarget = true;
          }
        }
        if (!hasSpecificTarget) {
          const sphereR = drone.zonePos.radius || 4.0;
          const angle = drone.wanderAngle || 0;
          targetCoord.set(
            drone.zonePos.x + Math.cos(angle) * (sphereR * 0.9),
            drone.zonePos.y + Math.sin(angle * 1.5) * (sphereR * 0.4),
            drone.zonePos.z + Math.sin(angle) * (sphereR * 0.9),
          );
        }
      }

      const stateElapsed = now - drone.stateStartTime;

      // Optical Eye Core Pulsing & Blue Joint Trim Glow
      if (drone.pupilMesh) {
        const pupilPulse = 1.0 + Math.sin(t * 8.0) * 0.08;
        drone.pupilMesh.scale.set(pupilPulse, pupilPulse, 0.3);
      }
      if (drone.accentTrimMeshes && drone.accentTrimMeshes.length > 0) {
        const trimWave = 0.75 + 0.25 * Math.sin(t * 5.0);
        for (const tm of drone.accentTrimMeshes) {
          if (tm.material) tm.material.opacity = trimWave;
        }
      }

      // -------------------------------------------------------------
      // STATE 0: PATROL (Smooth Organic 3D Wander, 50% Speed, Helicopter Altitude Maneuvers)
      // -------------------------------------------------------------
      if (drone.droneState === 0) {
        // Variable speed modulation ("lúc nhanh lúc chậm khác nhau 1 chút")
        const speedWave = 0.72 + Math.sin(t * 0.85 + drone.seedR) * 0.32 + Math.cos(t * 1.5) * 0.12;
        const currentSpeed = (drone.baseWanderSpeed || 0.011) * speedWave;

        // Bidirectional orbit advance (CW vs CCW)
        drone.wanderAngle += currentSpeed * (drone.orbitDirection || 1);
        const wAngle = drone.wanderAngle;

        // Dynamic orbit radius with organic breathing
        const rMod = drone.orbitRadius + Math.sin(wAngle * 1.4 + drone.seedR) * 2.2;

        // Helicopter-style vertical altitude reconnaissance sweeps ("lên xuống theo dọc thẳng đứng như kiểu trực thăng tuần tra")
        const verticalSweep = Math.sin(t * 0.65 + drone.seedY) * 5.2 + Math.sin(t * 1.35 + drone.seedPhase) * 1.8;

        const targetX = drone.zonePos.x + Math.cos(wAngle) * rMod + Math.sin(wAngle * 2.1) * 1.6;
        const targetZ = drone.zonePos.z + Math.sin(wAngle) * rMod + Math.cos(wAngle * 1.7) * 1.6;
        const targetY = drone.zonePos.y + 7.5 + verticalSweep;

        const curPos = drone.group.position;
        const prevX = curPos.x;
        const prevY = curPos.y;
        const prevZ = curPos.z;

        // Smooth position integration (eliminates any discontinuous jumps / pops)
        curPos.x = THREE.MathUtils.lerp(curPos.x, targetX, 0.08);
        curPos.y = THREE.MathUtils.lerp(curPos.y, targetY, 0.08);
        curPos.z = THREE.MathUtils.lerp(curPos.z, targetZ, 0.08);

        // Velocity & flight attitude
        const vx = curPos.x - prevX;
        const vy = curPos.y - prevY;
        const vz = curPos.z - prevZ;
        const horizSpeed = Math.hypot(vx, vz);

        // Heading: face instantaneous movement direction
        if (horizSpeed > 0.003) {
          const targetYaw = Math.atan2(vx, vz);
          drone.modelGroup.rotation.y = targetYaw;

          // Banking into turn (accounts for CW vs CCW direction)
          const bankAngle = THREE.MathUtils.clamp(-Math.sin(wAngle * 1.6) * 0.28 * (drone.orbitDirection || 1), -0.35, 0.35);
          drone.modelGroup.rotation.z = bankAngle;

          // Pitch follows vertical climb/descent
          const flightPitch = -Math.atan2(vy, horizSpeed);
          drone.modelGroup.rotation.x = THREE.MathUtils.clamp(flightPitch, -0.28, 0.28);
        }

        // Anti-gravity stabilization ring idle pulse
        if (drone.antiGravGlow) {
          const pScale = 0.95 + Math.sin(t * 12.0) * 0.15;
          drone.antiGravGlow.scale.set(pScale, pScale, pScale);
        }

        // 6 Legs Organic Breathing/Swimming Kinematics in Patrol
        if (drone.legs) {
          for (let i = 0; i < drone.legs.length; i++) {
            const leg = drone.legs[i];
            const legPhase = t * 2.2 + i * 1.05;
            leg.upperBoneGroup.rotation.z = leg.shoulderPitch + Math.sin(legPhase) * 0.05;
            leg.forearmGroup.rotation.z = leg.kneeBend + Math.sin(legPhase) * 0.08;
            leg.clawGroup.rotation.y = Math.sin(legPhase * 1.3) * 0.08;
            leg.clawGroup.position.x = 0;
            if (leg.bulletPool) {
              for (const bp of leg.bulletPool) {
                bp.bulletGroup.visible = false;
                bp.impactFlare.visible = false;
              }
            }
          }
        }
        drone.droneLight.intensity = 1.8 + Math.sin(t * 5.0) * 0.3;

        // State transition check (responsive file edit or patrol cycle duration reached)
        const canTriggerTarget = drone.isTargetingFile && stateElapsed >= 1000;
        if (stateElapsed >= drone.patrolDuration || canTriggerTarget) {
          drone.droneState = 1; // Transition directly to LASER_FIRE
          drone.stateStartTime = now;
          drone.hoverPos = drone.group.position.clone();

          // Prepare candidate micro-neuron targets strictly within current zone
          const candidateTargets = [];
          if (drone.plannedFiles && drone.plannedFiles.length > 0) {
            for (const f of drone.plannedFiles) {
              const fn = this.fileNodes.get(f) || this.findFileNodeByName(f);
              if (fn && fn.zoneId === drone.currentZoneId && fn.worldPos) {
                candidateTargets.push({ pos: fn.worldPos.clone(), node: fn });
              }
            }
          }
          const zoneFiles = this.fileNodesByZone ? this.fileNodesByZone.get(drone.currentZoneId) : null;
          if (zoneFiles && zoneFiles.length > 0) {
            for (const fn of zoneFiles) {
              if (fn && fn.worldPos) {
                candidateTargets.push({ pos: fn.worldPos.clone(), node: fn });
              }
            }
          }

          const sphereR = drone.zonePos.radius || 4.0;
          const getRandomMicroTarget = () => {
            if (candidateTargets.length > 0) {
              return candidateTargets[Math.floor(Math.random() * candidateTargets.length)];
            }
            const th = Math.random() * Math.PI * 2;
            const ph = (Math.random() - 0.5) * Math.PI * 0.8;
            const r = sphereR * (0.65 + Math.random() * 0.35);
            return {
              pos: new THREE.Vector3(
                drone.zonePos.x + r * Math.cos(ph) * Math.cos(th),
                drone.zonePos.y + r * Math.sin(ph),
                drone.zonePos.z + r * Math.cos(ph) * Math.sin(th),
              ),
              node: null,
            };
          };

          // Schedule independent multi-shot green laser bullet salvos across all 6 legs
          let maxSalvoEnd = now;
          if (drone.legs) {
            for (const leg of drone.legs) {
              // Staggered delay: 0.1s to 0.5s after hover stop
              const startDelay = 100 + Math.random() * 400;
              // 2 to 5 random shots per leg
              const shotCount = 2 + Math.floor(Math.random() * 4);
              // 0.3s to 0.7s interval between shots
              const interval = 300 + Math.random() * 380;
              const flightDuration = 220; // 220ms green plasma projectile streak

              const shots = [];
              for (let s = 0; s < shotCount; s++) {
                const fireTime = now + startDelay + s * interval;
                const hitTime = fireTime + flightDuration;
                const impactEndTime = hitTime + 240; // 240ms green impact plasma shockwave
                const target = getRandomMicroTarget();
                const bulletItem = leg.bulletPool ? leg.bulletPool[s % leg.bulletPool.length] : null;
                shots.push({
                  fireTime,
                  hitTime,
                  impactEndTime,
                  targetPos: target.pos,
                  targetNode: target.node,
                  muzzlePos: null,
                  bulletItem,
                  hasFired: false,
                  excited: false,
                });
                if (impactEndTime > maxSalvoEnd) {
                  maxSalvoEnd = impactEndTime;
                }
              }
              leg.salvo = {
                shots,
              };
            }
          }
          drone.laserDuration = Math.max(1800, maxSalvoEnd - now + 200);
        }
      }

      // -------------------------------------------------------------
      // STATE 1: LASER_FIRE (Stabilized Hover & 6-Channel Green Bullet Salvos)
      // -------------------------------------------------------------
      else if (drone.droneState === 1) {
        // Hover with laser weapon recoil micro-jitter
        drone.group.position.x = drone.hoverPos.x + (Math.random() - 0.5) * 0.08;
        drone.group.position.y = drone.hoverPos.y + Math.sin(t * 6.0) * 0.15 + (Math.random() - 0.5) * 0.08;
        drone.group.position.z = drone.hoverPos.z + (Math.random() - 0.5) * 0.08;

        // Keep model oriented toward zone center
        const dx = drone.zonePos.x - drone.group.position.x;
        const dy = drone.zonePos.y - drone.group.position.y;
        const dz = drone.zonePos.z - drone.group.position.z;
        drone.modelGroup.rotation.y = Math.atan2(dx, dz);
        const distHoriz = Math.hypot(dx, dz);
        drone.modelGroup.rotation.x = -Math.atan2(dy, distHoriz);
        drone.modelGroup.rotation.z = 0;

        const vEmitter = new THREE.Vector3();
        let anyFiring = false;

        if (drone.legs) {
          for (const leg of drone.legs) {
            let legAimTarget = null;

            if (leg.salvo && leg.salvo.shots) {
              for (const shot of leg.salvo.shots) {
                const { fireTime, hitTime, impactEndTime, targetPos, bulletItem } = shot;

                // 1. Green Laser Plasma Bullet in Flight (fireTime to hitTime)
                if (now >= fireTime && now < hitTime) {
                  anyFiring = true;
                  legAimTarget = targetPos;

                  if (!shot.hasFired) {
                    shot.hasFired = true;
                    leg.emitterMarker.getWorldPosition(vEmitter);
                    shot.muzzlePos = vEmitter.clone();
                  }

                  const flightProgress = (now - fireTime) / (hitTime - fireTime);
                  const p = Math.max(0, Math.min(1.0, flightProgress));

                  if (bulletItem && shot.muzzlePos) {
                    bulletItem.bulletGroup.visible = true;
                    bulletItem.bulletGroup.position.lerpVectors(shot.muzzlePos, targetPos, p);

                    const dir = new THREE.Vector3().subVectors(targetPos, shot.muzzlePos).normalize();
                    bulletItem.bulletGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

                    // Dynamic stretch along flight vector
                    bulletItem.bulletGroup.scale.set(1.0, 1.0 + Math.sin(p * Math.PI) * 0.45, 1.0);
                  }

                  // Mechanical claw recoil kick on discharge
                  leg.clawGroup.position.x = -Math.sin(p * Math.PI) * 0.28;
                }
                // 2. Green Plasma Impact Shockwave on Micro-Neuron Contact (hitTime to impactEndTime)
                else if (now >= hitTime && now < impactEndTime) {
                  if (bulletItem) {
                    bulletItem.bulletGroup.visible = false;
                  }

                  const impactProgress = (now - hitTime) / (impactEndTime - hitTime);
                  const ip = Math.max(0, Math.min(1.0, impactProgress));

                  if (bulletItem && bulletItem.impactFlare) {
                    bulletItem.impactFlare.visible = true;
                    bulletItem.impactFlare.position.copy(targetPos);
                    bulletItem.impactFlare.quaternion.copy(this.camera.quaternion);

                    const flareScale = 1.0 + Math.pow(ip, 0.4) * 2.2;
                    bulletItem.impactFlare.scale.set(flareScale, flareScale, 1.0);
                    bulletItem.impactFlare.material.opacity = Math.sin((1.0 - ip) * Math.PI) * 0.95;
                  }

                  // Synaptic excitation on target micro-neuron once at hit
                  if (!shot.excited) {
                    shot.excited = true;
                    if (shot.targetNode) {
                      shot.targetNode.orbitalSurge = 1.0;
                      shot.targetNode.wasDendriteSurging = true;
                    }
                  }
                }
                // 3. Inactive shot state
                else {
                  if (bulletItem) {
                    if (now >= impactEndTime) {
                      bulletItem.impactFlare.visible = false;
                    }
                    if (now < fireTime) {
                      bulletItem.bulletGroup.visible = false;
                      bulletItem.impactFlare.visible = false;
                    }
                  }
                }

                // Anticipatory claw aiming 120ms before fire
                if (!legAimTarget && now >= fireTime - 120 && now < fireTime) {
                  legAimTarget = targetPos;
                }
              }
            }

            // Aim the forearm and claw toward target when firing or preparing to fire
            if (legAimTarget) {
              const localTarget = leg.elbowGroup.worldToLocal(legAimTarget.clone());
              const aimAngle = Math.atan2(localTarget.y, localTarget.x);
              leg.forearmGroup.rotation.z = THREE.MathUtils.lerp(leg.forearmGroup.rotation.z, aimAngle, 0.35);
            } else {
              leg.clawGroup.position.x = THREE.MathUtils.lerp(leg.clawGroup.position.x, 0, 0.15);
              leg.forearmGroup.rotation.z = THREE.MathUtils.lerp(leg.forearmGroup.rotation.z, leg.kneeBend, 0.1);
            }
          }
        }

        // Optical core flashes brighter when any turret is firing
        if (drone.pupilMesh) {
          drone.pupilMesh.scale.setScalar(anyFiring ? 1.25 : 1.0 + Math.sin(t * 10.0) * 0.05);
        }
        drone.droneLight.intensity = anyFiring ? 3.2 : 1.8;

        // State transition check: after all 6 legs finish firing salvos, transition to eye charge!
        if (stateElapsed >= drone.laserDuration) {
          if (drone.legs) {
            for (const leg of drone.legs) {
              if (leg.bulletPool) {
                for (const bp of leg.bulletPool) {
                  bp.bulletGroup.visible = false;
                  bp.impactFlare.visible = false;
                }
              }
              leg.clawGroup.position.x = 0;
              leg.forearmGroup.rotation.z = leg.kneeBend;
            }
          }

          // Transition to STATE 3: EYE_CHARGE
          drone.droneState = 3;
          drone.stateStartTime = now;
          drone.chargeDuration = 2000;
          if (drone.chargingOrbGroup) {
            drone.chargingOrbGroup.visible = true;
            drone.chargingOrbGroup.scale.set(0.05, 0.05, 0.05);
          }
        }
      }

      // -------------------------------------------------------------
      // STATE 2: TRANSIT (Dynamic Inter-Sphere Flight between Duty Spheres)
      // -------------------------------------------------------------
      else if (drone.droneState === 2) {
        const transitElapsed = now - drone.transitStartTime;
        const progress = Math.min(1.0, transitElapsed / drone.transitDuration);

        // Smooth cubic Hermite ease
        const ease = progress * progress * (3.0 - 2.0 * progress);

        // Interpolate horizontal position
        const curX = THREE.MathUtils.lerp(drone.transitStartPos.x, drone.transitTargetPos.x, ease);
        const curZ = THREE.MathUtils.lerp(drone.transitStartPos.z, drone.transitTargetPos.z, ease);
        // Upward parabolic clearance arc to soar cleanly over conduits
        const arcHeight = Math.sin(progress * Math.PI) * 7.5;
        const curY = THREE.MathUtils.lerp(drone.transitStartPos.y, drone.transitTargetPos.y, ease) + arcHeight;

        const prevPos = drone.group.position.clone();
        drone.group.position.set(curX, curY, curZ);

        // Flight attitude calculation
        const vx = curX - prevPos.x;
        const vy = curY - prevPos.y;
        const vz = curZ - prevPos.z;
        const horizSpeed = Math.hypot(vx, vz);

        if (horizSpeed > 0.005) {
          const flightYaw = Math.atan2(vx, vz);
          drone.modelGroup.rotation.y = flightYaw;

          // Pitch follows vertical trajectory
          const flightPitch = -Math.atan2(vy, horizSpeed);
          drone.modelGroup.rotation.x = THREE.MathUtils.clamp(flightPitch, -0.35, 0.35);

          // Dynamic banking roll
          const targetDx = drone.transitTargetPos.x - curX;
          const targetDz = drone.transitTargetPos.z - curZ;
          const headingToTarget = Math.atan2(targetDx, targetDz);
          let angleDiff = headingToTarget - flightYaw;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          drone.modelGroup.rotation.z = THREE.MathUtils.clamp(-angleDiff * 0.8, -0.45, 0.45);
        }

        // Aerodynamic leg sweep during transit
        if (drone.legs) {
          for (const leg of drone.legs) {
            leg.upperBoneGroup.rotation.z = leg.shoulderPitch * 0.4;
            leg.forearmGroup.rotation.z = leg.kneeBend * 0.3;
            if (leg.bulletPool) {
              for (const bp of leg.bulletPool) {
                bp.bulletGroup.visible = false;
                bp.impactFlare.visible = false;
              }
            }
          }
        }

        // Powerful anti-gravity ion flare during inter-sphere burn
        if (drone.antiGravGlow) {
          const thrusterBurn = 1.3 + Math.sin(t * 25.0) * 0.25;
          drone.antiGravGlow.scale.set(thrusterBurn, thrusterBurn, thrusterBurn);
        }

        // Rapid flashing strobe beacon during transit
        drone.droneLight.intensity = 2.4 + Math.sin(t * 12.0) * 0.6;

        // Waypoint arrival
        if (progress >= 1.0) {
          drone.currentWaypoint = drone.nextWaypoint;
          drone.currentZoneId = drone.currentWaypoint.zoneId;
          drone.zonePos = drone.currentWaypoint.pos;

          // SEAMLESS SYNCHRONIZATION: calculate wanderAngle directly from drone's current arrival position!
          this.syncDroneOrbitFromCurrentPos(drone);

          // Randomize initial orbit direction (CW vs CCW) for the new sphere
          drone.orbitDirection = Math.random() > 0.5 ? 1 : -1;
          drone.patrolCyclesAtSphere = 0;
          drone.maxPatrolCyclesAtSphere = 2;

          if (drone.antiGravGlow) {
            drone.antiGravGlow.scale.set(1, 1, 1);
          }
          if (drone.legs) {
            for (const leg of drone.legs) {
              leg.upperBoneGroup.rotation.z = leg.shoulderPitch;
              leg.forearmGroup.rotation.z = leg.kneeBend;
            }
          }

          drone.droneState = 0; // Resume PATROL around new sphere
          drone.stateStartTime = now;
          drone.patrolDuration = 2000 + Math.random() * 800;
        }
      }

      // -------------------------------------------------------------
      // STATE 3: EYE_CHARGE (2.0s Ocular Plasma Condensation in front of Eye)
      // -------------------------------------------------------------
      else if (drone.droneState === 3) {
        const chargeElapsed = now - drone.stateStartTime;
        const cp = Math.min(1.0, chargeElapsed / (drone.chargeDuration || 2000));

        // Keep drone oriented toward claimed zone sphere
        const dx = drone.zonePos.x - drone.group.position.x;
        const dy = drone.zonePos.y - drone.group.position.y;
        const dz = drone.zonePos.z - drone.group.position.z;
        drone.modelGroup.rotation.y = Math.atan2(dx, dz);
        const distHoriz = Math.hypot(dx, dz);
        drone.modelGroup.rotation.x = -Math.atan2(dy, distHoriz);
        drone.modelGroup.rotation.z = 0;

        // Hover position with escalating plasma turbulence jitter
        const jitter = 0.02 + cp * 0.12;
        drone.group.position.x = drone.hoverPos.x + (Math.random() - 0.5) * jitter;
        drone.group.position.y = drone.hoverPos.y + (Math.random() - 0.5) * jitter;
        drone.group.position.z = drone.hoverPos.z + (Math.random() - 0.5) * jitter;

        // Limbs tense up and brace backward in anticipation of mega-blast
        if (drone.legs) {
          for (let i = 0; i < drone.legs.length; i++) {
            const leg = drone.legs[i];
            leg.forearmGroup.rotation.z = THREE.MathUtils.lerp(leg.forearmGroup.rotation.z, leg.kneeBend - cp * 0.25, 0.2);
            leg.clawGroup.position.x = THREE.MathUtils.lerp(leg.clawGroup.position.x, -cp * 0.15, 0.2);
          }
        }

        // Plasma sphere synthesizes and grows directly in front of the eye over 2.0s
        if (drone.chargingOrbGroup) {
          drone.chargingOrbGroup.visible = true;
          const orbScale = 0.08 + Math.pow(cp, 0.8) * 1.55;
          drone.chargingOrbGroup.scale.set(orbScale, orbScale, orbScale);

          // Accretion rings accelerate rotation
          if (drone.accretionRing1) {
            drone.accretionRing1.rotation.z += 0.08 + cp * 0.25;
          }
          if (drone.accretionRing2) {
            drone.accretionRing2.rotation.x += 0.06 + cp * 0.22;
          }
        }

        // Optical eye pupil pulses with blinding intensity
        if (drone.pupilMesh) {
          const pupilPulse = 1.0 + cp * 0.45 + Math.sin(t * (10.0 + cp * 25.0)) * 0.12;
          drone.pupilMesh.scale.set(pupilPulse, pupilPulse, 0.3);
        }
        drone.droneLight.intensity = 2.0 + cp * 3.5;

        // Charge complete (2.0s reached) -> Fire colossal mega-blast!
        if (cp >= 1.0) {
          drone.droneState = 4; // MEGA_BLAST
          drone.stateStartTime = now;
          drone.blastDuration = 450;
          if (drone.chargingOrbGroup) drone.chargingOrbGroup.visible = false;
          if (drone.megaBeamGroup) drone.megaBeamGroup.visible = true;
          if (drone.megaImpactFlare) drone.megaImpactFlare.visible = true;

          // Trigger 3.0s chromatic gradient surge on target zone sphere
          const zoneNode = this.nodeMeshes.get(drone.currentZoneId);
          if (zoneNode) {
            zoneNode.gradientSurge = {
              startTime: now,
              duration: 3000,
            };
          }
        }
      }

      // -------------------------------------------------------------
      // STATE 4: MEGA_BLAST (Colossal Volumetric Laser Cannon Fire & Zone Surge)
      // -------------------------------------------------------------
      else if (drone.droneState === 4) {
        const blastElapsed = now - drone.stateStartTime;
        const bp = Math.min(1.0, blastElapsed / (drone.blastDuration || 450));
        const pulse = Math.sin(bp * Math.PI);

        // Keep drone facing target sphere
        const dx = drone.zonePos.x - drone.group.position.x;
        const dy = drone.zonePos.y - drone.group.position.y;
        const dz = drone.zonePos.z - drone.group.position.z;
        drone.modelGroup.rotation.y = Math.atan2(dx, dz);
        const distHoriz = Math.hypot(dx, dz);
        drone.modelGroup.rotation.x = -Math.atan2(dy, distHoriz);
        drone.modelGroup.rotation.z = 0;

        // Violent cannon recoil kick backwards!
        const recoilDir = new THREE.Vector3(-dx, -dy, -dz).normalize();
        const kickAmount = pulse * 1.6;
        drone.group.position.x = drone.hoverPos.x + recoilDir.x * kickAmount + (Math.random() - 0.5) * 0.15;
        drone.group.position.y = drone.hoverPos.y + recoilDir.y * kickAmount + (Math.random() - 0.5) * 0.15;
        drone.group.position.z = drone.hoverPos.z + recoilDir.z * kickAmount + (Math.random() - 0.5) * 0.15;

        // Limbs splayed backward during cannon recoil
        if (drone.legs) {
          for (let i = 0; i < drone.legs.length; i++) {
            const leg = drone.legs[i];
            leg.forearmGroup.rotation.z = leg.kneeBend - pulse * 0.35;
            leg.clawGroup.position.x = -pulse * 0.35;
          }
        }

        // Compute eye world position
        const vEye = new THREE.Vector3();
        if (drone.pupilMesh) {
          drone.pupilMesh.getWorldPosition(vEye);
        } else {
          vEye.copy(drone.group.position);
        }

        const targetPos = new THREE.Vector3(drone.zonePos.x, drone.zonePos.y, drone.zonePos.z);
        const beamVec = new THREE.Vector3().subVectors(targetPos, vEye);
        const dist = beamVec.length();
        const dir = beamVec.clone().normalize();

        // Update colossal volumetric mega-beam
        if (drone.megaBeamGroup) {
          drone.megaBeamGroup.visible = true;
          drone.megaBeamGroup.position.copy(vEye);
          drone.megaBeamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

          const radialScale = 1.0 + pulse * 0.8;
          drone.megaBeamGroup.scale.set(radialScale, dist, radialScale);
          if (drone.megaOuterMat) drone.megaOuterMat.opacity = 0.95 * pulse;
          if (drone.megaCoreMat) drone.megaCoreMat.opacity = 1.0 * pulse;
        }

        // Update mega impact flare shockwave at target sphere
        if (drone.megaImpactFlare) {
          drone.megaImpactFlare.visible = true;
          drone.megaImpactFlare.position.copy(targetPos);
          drone.megaImpactFlare.quaternion.copy(this.camera.quaternion);

          const flareScale = 1.0 + Math.pow(bp, 0.4) * 4.8;
          drone.megaImpactFlare.scale.set(flareScale, flareScale, 1.0);
          drone.megaImpactFlare.material.opacity = 0.95 * pulse;
        }

        drone.droneLight.intensity = 5.0 * pulse;

        // Blast ends -> Resume patrol or transit
        if (bp >= 1.0) {
          if (drone.megaBeamGroup) drone.megaBeamGroup.visible = false;
          if (drone.megaImpactFlare) drone.megaImpactFlare.visible = false;
          if (drone.legs) {
            for (const leg of drone.legs) {
              leg.clawGroup.position.x = 0;
              leg.upperBoneGroup.rotation.z = leg.shoulderPitch;
              leg.forearmGroup.rotation.z = leg.kneeBend;
            }
          }

          drone.plannedFileIndex++;
          drone.patrolCyclesAtSphere = (drone.patrolCyclesAtSphere || 0) + 1;

          // Check if drone has completed 2 patrol cycles at this sphere before transiting
          const targetCycles = drone.maxPatrolCyclesAtSphere || 2;
          if (drone.patrolCyclesAtSphere >= targetCycles && drone.dutyWaypoints && drone.dutyWaypoints.length > 1) {
            drone.patrolCyclesAtSphere = 0;
            drone.maxPatrolCyclesAtSphere = 2;

            drone.droneState = 2; // Transition to TRANSIT
            drone.transitStartTime = now;
            drone.transitStartPos.copy(drone.group.position);

            // Randomly select next destination sphere from claim's red/yellow waypoints (avoiding current sphere)
            const otherWaypoints = drone.dutyWaypoints.filter((wp) => wp.zoneId !== drone.currentZoneId);
            const candidateWaypoints = otherWaypoints.length > 0 ? otherWaypoints : drone.dutyWaypoints;
            const nextWp = candidateWaypoints[Math.floor(Math.random() * candidateWaypoints.length)];
            drone.nextWaypoint = nextWp;

            const nextPos = nextWp.pos;
            const entryAngle = Math.random() * Math.PI * 2;
            const entryRadius = (nextPos.radius || 4) * 2.2 + 5.5 + Math.random() * 2.0;
            drone.transitTargetPos.set(
              nextPos.x + Math.cos(entryAngle) * entryRadius,
              nextPos.y + 7.5 + (Math.random() - 0.5) * 4.0,
              nextPos.z + Math.sin(entryAngle) * entryRadius,
            );

            const travelDist = drone.transitStartPos.distanceTo(drone.transitTargetPos);
            drone.transitDuration = Math.max(4800, Math.min(9000, 3200 + travelDist * 35));
          } else {
            // Resume PATROL at current sphere
            this.syncDroneOrbitFromCurrentPos(drone);
            if (Math.random() < 0.5) {
              drone.orbitDirection = -(drone.orbitDirection || 1);
            }
            drone.droneState = 0; // Return to PATROL
            drone.stateStartTime = now;
            drone.patrolDuration = 1800 + Math.random() * 1200;
          }
        }
      }
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
    this.renderer.render(this.scene, this.camera);
  }
}
