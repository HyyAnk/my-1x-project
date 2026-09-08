/**
 * Centralized raycast hit-testing: file micro-neurons first (via InstancedMesh
 * instanceId), then zone macro-node core meshes. Owns the hovered file/zone
 * state and cursor styling; selection/hover decisions stay with callbacks.
 */
export class RaycastPicker {
  constructor(sceneManager, fileNeuronSystem, zoneNodeSystem, callbacks) {
    this.sceneManager = sceneManager;
    this.fileNeuronSystem = fileNeuronSystem;
    this.zoneNodeSystem = zoneNodeSystem;
    this.onFileHover = callbacks.onFileHover;
    this.hoveredFileNode = null;
    this.hoveredZoneId = null;
    this.mouseClientX = 0;
    this.mouseClientY = 0;
  }

  /** True if a file micro-neuron is under the pointer. */
  pickFileNode() {
    const { raycaster, mouse, camera } = this.sceneManager;
    raycaster.setFromCamera(mouse, camera);
    if (!this.fileNeuronSystem.fileInstancedMesh) return null;

    const fileHits = raycaster.intersectObject(this.fileNeuronSystem.fileInstancedMesh);
    if (fileHits.length > 0 && typeof fileHits[0].instanceId === "number") {
      return this.fileNeuronSystem.fileNodesByIndex[fileHits[0].instanceId] || null;
    }
    return null;
  }

  /** Returns the clicked zone's data object, or null (click handling). */
  pickZoneNode(coordinationState) {
    const { raycaster } = this.sceneManager;
    const hitCandidates = this.zoneNodeSystem.getCoreMeshes();
    const intersects = raycaster.intersectObjects(hitCandidates);
    if (intersects.length === 0) return null;

    const hitZoneId = intersects[0].object.userData.zoneId;
    return coordinationState?.zones?.find((z) => z.id === hitZoneId) || null;
  }

  /** Per-frame hover highlighting with file-first, zone-second priority. */
  updateHover() {
    const hitFile = this.pickFileNode();

    if (hitFile) {
      if (this.hoveredFileNode !== hitFile) {
        this.hoveredFileNode = hitFile;
        document.body.style.cursor = "pointer";
      }
      this.onFileHover(hitFile, { clientX: this.mouseClientX, clientY: this.mouseClientY });
      return;
    }

    if (this.hoveredFileNode) {
      this.hoveredFileNode = null;
      this.onFileHover(null);
    }

    const { raycaster } = this.sceneManager;
    const hitCandidates = this.zoneNodeSystem.getCoreMeshes();
    const intersects = raycaster.intersectObjects(hitCandidates);

    if (intersects.length > 0) {
      const hitZoneId = intersects[0].object.userData.zoneId;
      if (this.hoveredZoneId !== hitZoneId) {
        this.hoveredZoneId = hitZoneId;
        document.body.style.cursor = "pointer";
      }
    } else if (this.hoveredZoneId) {
      this.hoveredZoneId = null;
      document.body.style.cursor = "default";
    }
  }
}
