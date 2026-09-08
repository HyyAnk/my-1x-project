import * as THREE from "three";
import { ZONE_POSITIONS, COLOR_MAP } from "../topology-layout.js";
import { SceneManager } from "./scene/SceneManager.js";
import { CameraDirector } from "./scene/CameraDirector.js";
import { ZoneNodeSystem } from "./entities/ZoneNodeSystem.js";
import { ZoneNodeAnimator } from "./entities/ZoneNodeAnimator.js";
import { AxonSystem } from "./entities/AxonSystem.js";
import { FileNeuronSystem } from "./entities/FileNeuronSystem.js";
import { FileNeuronAnimator } from "./entities/FileNeuronAnimator.js";
import { AgentDroneSystem, DRONE_PALETTES } from "./drones/AgentDroneSystem.js";
import { DroneAnimator } from "./drones/DroneAnimator.js";
import { HologramBadgeSystem } from "./effects/HologramBadgeSystem.js";
import { HeatmapShaderSystem } from "./effects/HeatmapShaderSystem.js";
import { AmbientBeamSystem } from "./effects/AmbientBeamSystem.js";
import { RaycastPicker } from "./interactions/RaycastPicker.js";
import { ActivityBatchQueue } from "./interactions/ActivityBatchQueue.js";

export { ZONE_POSITIONS, COLOR_MAP, DRONE_PALETTES };

/**
 * Orchestrator for the 3D neural coordination graph. Wires the scene, entity,
 * drone, effect, and interaction subsystems together and preserves the exact
 * public API consumed by app.js. All heavy logic lives in the subsystems.
 */
export class NeuralGraph {
  constructor(containerElement, onNodeSelect, onFileSelect, onFileHover) {
    this.onNodeSelect = onNodeSelect || (() => {});
    this.onFileSelect = onFileSelect || (() => {});
    this.onFileHover = onFileHover || (() => {});
    this.coordinationState = null;
    this.safeZoneMode = null;

    // Scene layer
    this.sceneManager = new SceneManager(containerElement);
    this.cameraDirector = new CameraDirector(this.sceneManager);

    // Entity layer
    this.zoneNodeSystem = new ZoneNodeSystem(this.sceneManager.scene);
    this.zoneNodeAnimator = new ZoneNodeAnimator(this.zoneNodeSystem);
    this.axonSystem = new AxonSystem(this.sceneManager.scene);
    this.fileNeuronSystem = new FileNeuronSystem(this.sceneManager.scene);
    this.fileNeuronAnimator = new FileNeuronAnimator(this.fileNeuronSystem);

    // Drone layer
    this.agentDroneSystem = new AgentDroneSystem(this.sceneManager.scene, this.fileNeuronSystem, this.zoneNodeSystem);
    this.droneAnimator = new DroneAnimator(
      this.agentDroneSystem,
      this.sceneManager.scene,
      this.sceneManager.camera,
      this.fileNeuronSystem,
      this.zoneNodeSystem,
    );

    // Effects + interactions layer
    this.hologramBadges = new HologramBadgeSystem(this.sceneManager.scene, this.sceneManager.camera);
    this.heatmap = new HeatmapShaderSystem();
    this.ambientBeams = new AmbientBeamSystem(this.sceneManager.scene);
    this.raycastPicker = new RaycastPicker(this.sceneManager, this.fileNeuronSystem, this.zoneNodeSystem, {
      onFileHover: (fileNode, screenPos) => this.onFileHover(fileNode, screenPos),
    });
    this.activityQueue = new ActivityBatchQueue({
      onFlush: (zoneId, activities) => this.flushBatchActivity(zoneId, activities),
    });

    this.sceneManager.onMouseMove = (clientX, clientY) => {
      this.raycastPicker.mouseClientX = clientX;
      this.raycastPicker.mouseClientY = clientY;
    };
    this.sceneManager.renderer.domElement.addEventListener("click", () => this.handleClick());

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  handleClick() {
    // 1. Check if a File Micro-Neuron was clicked
    const hitFile = this.raycastPicker.pickFileNode();
    if (hitFile) {
      this.onFileSelect(hitFile);
      return;
    }

    // 2. Check if a Zone Macro-Node was clicked
    const zoneData = this.raycastPicker.pickZoneNode(this.coordinationState);
    if (zoneData) {
      this.onNodeSelect(zoneData);
    }
  }

  loadTopology(topology) {
    // 1. Build Multi-Layer 3D Neuron Somata
    this.zoneNodeSystem.buildNodes(topology.zones);

    // 2. Build Synaptic Axons with Volumetric Optical Conduits & Streamlined Light Beams
    const existingPairs = this.axonSystem.buildAxons(topology.links);

    // 3. Build Organic Layer Cluster Tendrils (Connecting Intra-Layer Nodes)
    this.zoneNodeSystem.buildLayerTendrils(existingPairs);

    // 4. Build File Micro-Neurons Galaxy (1,100+ files as micro-synaptic star clusters)
    if (topology.files && topology.files.length > 0) {
      this.fileNeuronSystem.build(topology.files);
    }
  }

  updateState(state) {
    this.coordinationState = state;
    if (!state || !state.zones) return;

    if (this.safeZoneMode) {
      this.applySafeZoneHighlights();
      this.agentDroneSystem.update(state.claims || [], state.zones || []);
      return;
    }

    this.applyZoneStateColors(state.zones);

    // Update axon impulses based on activity
    const activeZoneIds = new Set(state.zones.filter((z) => z.status === "active").map((z) => z.id));
    this.axonSystem.applyState(activeZoneIds);

    // Synchronize 3D Agent Cyber Drones (always active, multi-zone per claim)
    this.agentDroneSystem.update(state.claims || [], state.zones || []);
  }

  applyZoneStateColors(zones) {
    for (const zState of zones) {
      const node = this.zoneNodeSystem.nodeMeshes.get(zState.id);
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
  }

  highlightSafeZones(targetZoneId, safeZoneIds, conflictingZones) {
    const safeSet = new Set(safeZoneIds);
    this.safeZoneMode = { targetZoneId, safeSet, conflictingZones };
    this.applySafeZoneHighlights();
  }

  applySafeZoneHighlights() {
    if (!this.safeZoneMode) return;
    const { targetZoneId, safeSet } = this.safeZoneMode;

    for (const [id, node] of this.zoneNodeSystem.nodeMeshes) {
      if (id === targetZoneId) {
        // Target: bright amber glow
        this.paintNode(node, {
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.3,
          transparent: false,
          coreOpacity: 1.0,
          latticeOpacity: 0.8,
          labelOpacity: 1.0,
        });
      } else if (safeSet.has(id)) {
        // Safe: emerald green glow
        this.paintNode(node, {
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 1.0,
          transparent: false,
          coreOpacity: 1.0,
          latticeOpacity: 0.5,
          labelOpacity: 0.9,
        });
      } else {
        // Conflicting: dim red/slate
        this.paintNode(node, {
          color: 0x334155,
          emissive: 0xef4444,
          emissiveIntensity: 0.2,
          transparent: true,
          coreOpacity: 0.35,
          latticeOpacity: 0.1,
          labelOpacity: 0.3,
        });
      }
    }

    this.axonSystem.applySafeZoneHighlights(targetZoneId, safeSet);
  }

  paintNode(node, style) {
    node.coreMesh.material.color.setHex(style.color);
    node.coreMesh.material.emissive.setHex(style.emissive);
    node.coreMesh.material.emissiveIntensity = style.emissiveIntensity;
    node.coreMesh.material.transparent = style.transparent;
    node.coreMesh.material.opacity = style.coreOpacity;
    node.latticeMesh.material.color.setHex(style.color);
    node.latticeMesh.material.opacity = style.latticeOpacity;
    node.gyroRing1.material.color.setHex(style.color);
    node.gyroRing2.material.color.setHex(style.color);
    node.labelSprite.material.opacity = style.labelOpacity;
  }

  clearSafeZoneHighlights() {
    this.safeZoneMode = null;
    for (const node of this.zoneNodeSystem.nodeMeshes.values()) {
      node.coreMesh.material.transparent = false;
      node.coreMesh.material.opacity = 1.0;
      node.latticeMesh.material.opacity = 0.35;
      node.gyroRing1.material.opacity = 0.45;
      node.gyroRing2.material.opacity = 0.35;
      node.labelSprite.material.opacity = 1.0;
    }
    this.axonSystem.clearSafeZoneHighlights();
    this.updateState(this.coordinationState);
  }

  flyToNode(zoneId) {
    this.cameraDirector.flyToNode(zoneId);
  }

  resetCamera() {
    this.cameraDirector.resetCamera();
  }

  toggleAutoRotate() {
    this.cameraDirector.toggleAutoRotate();
  }

  toggleHeatmap(forceState) {
    return this.heatmap.toggleHeatmap(forceState);
  }

  cycleCameraMode() {
    return this.cameraDirector.cycleCameraMode(this.agentDroneSystem.agentDrones);
  }

  setCameraMode(modeIndex) {
    return this.cameraDirector.setCameraMode(modeIndex, this.agentDroneSystem.agentDrones);
  }

  triggerFileActivity(activity) {
    this.activityQueue.enqueue(activity);
  }

  flushBatchActivity(zoneId, activities) {
    // If batch has >= 4 files, spawn a single consolidated cluster badge!
    if (activities.length >= 4) {
      const firstAct = activities[0];
      const agentName = firstAct.agent || null;
      const zoneNode = this.zoneNodeSystem.nodeMeshes.get(zoneId);
      const zonePos = zoneNode ? zoneNode.group.position : ZONE_POSITIONS[zoneId] || { x: 0, y: 0, z: 0 };
      const zoneName = zoneNode?.zone?.name || zoneId;

      this.hologramBadges.spawnHologramBadgeAtPos(zonePos, `${activities.length} files in ${zoneName}`, "change", agentName, true);

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
      this.heatmap.bumpFileHeat(file, 1.2);
    }
    this.heatmap.bumpZoneHeat(zoneId, 0.8);

    // Excite micro neuron
    const fileNode = this.exciteMicroNeuron(activity, true);

    // Cascade into zone macro-neuron
    const zoneNode = this.zoneNodeSystem.nodeMeshes.get(zoneId);
    if (zoneNode) {
      setTimeout(
        () => {
          zoneNode.excitation = 1.0;
          zoneNode.lastSpikeTime = performance.now();
        },
        fileNode ? 180 : 0,
      );

      if (!fileNode) {
        this.hologramBadges.spawnHologramBadgeAtPos(zoneNode.group.position, fileName || "file", eventType || "change", agent, false);
      }
    }
  }

  exciteMicroNeuron(activity, spawnBadge = true) {
    const { file, fileName, eventType, agent } = activity;
    const fileKey = file ? file.replace(/\\/g, "/") : null;
    let fileNode = fileKey ? this.fileNeuronSystem.fileNodes.get(fileKey) : null;
    if (!fileNode && fileName) {
      fileNode = this.fileNeuronSystem.findFileNodeByName(fileName);
    }

    if (fileNode) {
      fileNode.excitation = 1.0;
      fileNode.lastSpikeTime = performance.now();
      fileNode.eventType = eventType || "change";
      fileNode.orbitalSurge = 1.0;
      fileNode.dendriteSurge = 1.0;

      this.hologramBadges.spawnMicroHalo(fileNode.worldPos);
      if (spawnBadge) {
        this.hologramBadges.spawnHologramBadgeAtPos(fileNode.worldPos, fileName || fileNode.name, eventType || "change", agent, false);
      }

      // Direct drone laser scanner toward this micro-neuron if drone exists for this agent
      // STRICTLY scoped to drone's current zone to eliminate cross-zone laser fire
      if (agent) {
        for (const drone of this.agentDroneSystem.agentDrones.values()) {
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

    // Smooth camera fly-to interpolation
    this.cameraDirector.updateAnimation();

    // Animate Multi-layer Neurons
    this.zoneNodeAnimator.update(now, t, this.coordinationState, this.raycastPicker.hoveredZoneId);

    // Animate floating hologram badges + micro-halo ripples
    this.hologramBadges.update(now);

    // Animate axon conduit lines based on zone activity
    this.axonSystem.update(this.raycastPicker.hoveredZoneId, Boolean(this.safeZoneMode));

    // Animate ambient staggered synaptic light beams running through random axon conduits
    this.ambientBeams.update(now, this.axonSystem.axonLines, this.zoneNodeSystem.nodeMeshes);

    // Animate slow cosmic orbital rotation of file micro-neurons and dendrites
    this.fileNeuronAnimator.update(now, t, this.heatmap);

    // Raycast hover highlighting: file micro-neurons first, then macro zone nodes
    this.raycastPicker.updateHover();

    // Animate 3D Agent Procedural Cyber Drones
    this.droneAnimator.update(now, t);

    // Gradual thermodynamic heat decay
    this.heatmap.decayHeat();

    // Agent Follow Camera tracking
    this.cameraDirector.updateFollowTracking(this.agentDroneSystem.agentDrones);

    this.sceneManager.update();
  }
}
