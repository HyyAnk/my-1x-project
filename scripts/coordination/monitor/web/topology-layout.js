/**
 * Curated spatial 3D layout coordinates for all 19 codebase zones.
 * Pure data module with zero external imports - compatible with both browser and Node.js.
 */
export const ZONE_POSITIONS = {
  // CORE HUB (Center)
  "shared-contracts": { x: 0, y: 0, z: 0, layer: "core", radius: 5.5, label: "Shared Contracts" },
  "project-configuration": { x: 20, y: 15, z: -10, layer: "core", radius: 3.8, label: "Project Config" },
  "artifact-contracts": { x: -15, y: -15, z: 25, layer: "core", radius: 3.8, label: "Artifact Contracts" },

  // SERVER LAYER (Upper-Left Cluster)
  "server-pipeline": { x: -55, y: 35, z: 20, layer: "server", radius: 4.2, label: "Server Pipeline" },
  "api-contracts": { x: -38, y: 18, z: 32, layer: "server", radius: 4.0, label: "API Contracts" },
  "task-status-progress": { x: -70, y: 15, z: -15, layer: "server", radius: 3.6, label: "Task Status" },
  "server-core": { x: -50, y: 55, z: 0, layer: "server", radius: 3.8, label: "Server Core" },
  "server-tests": { x: -85, y: 42, z: -25, layer: "server", radius: 3.4, label: "Server Tests" },

  // RENDER & VISUAL LAYER (Lower-Left Cluster)
  "render-inputs": { x: -75, y: -18, z: 25, layer: "render", radius: 3.6, label: "Render Inputs" },
  "render-implementation": { x: -55, y: -35, z: 45, layer: "render", radius: 4.0, label: "Render Impl" },
  "image-thumbnail-prompt": { x: -25, y: -50, z: 30, layer: "render", radius: 3.6, label: "Thumbnail Prompt" },

  // QUALITY, MEDIA & ARTIFACTS (Lower-Right Cluster)
  "quality-timeline": { x: 15, y: -45, z: 35, layer: "media", radius: 3.8, label: "Quality Timeline" },
  "media-providers": { x: 40, y: -55, z: 15, layer: "media", radius: 3.8, label: "Media Providers" },
  "generated-artifacts": { x: 30, y: -65, z: -20, layer: "media", radius: 3.5, label: "Generated Artifacts" },

  // WEB APPS LAYER (Upper-Right Cluster)
  "web-api-state": { x: 45, y: 20, z: 45, layer: "web", radius: 4.0, label: "Web API State" },
  "web-layout-style": { x: 75, y: 45, z: 15, layer: "web", radius: 3.8, label: "Web Layout Style" },

  // SERVICES & RUNTIME (Back Cluster)
  "tts-service": { x: -30, y: -20, z: -60, layer: "services", radius: 4.0, label: "TTS Service" },
  "runtime-resources": { x: 25, y: -25, z: -55, layer: "runtime", radius: 3.6, label: "Runtime Resources" },

  // META & INFRASTRUCTURE (Top Apex)
  "agent-coordination": { x: 0, y: 75, z: 0, layer: "infra", radius: 5.0, label: "Agent Coordination" },
};

export const COLOR_MAP = {
  idle: 0x00f0ff,        // Neon Cyan
  active: 0xff0055,      // Neon Magenta/Red
  read_stable: 0xf59e0b, // Amber
  high_risk_hub: 0xa855f7 // Royal Purple
};
