/**
 * MonitorApp: composition root for the Agent-Monitor dashboard.
 * Wires the 3D NeuralGraph and the focused controllers together and owns the
 * shared state snapshot plus global UI event registration. The former god
 * script's boot behavior is preserved by the `app.js` entry module.
 */

import { NeuralGraph } from "../neural-graph.js";
import { queryMonitorElements } from "./domElements.js";
import { SseConnectionController } from "./SseConnectionController.js";
import { ZoneDrawerController } from "./ZoneDrawerController.js";
import { MatrixModalController } from "./MatrixModalController.js";
import { FileActivityController } from "./FileActivityController.js";

export class MonitorApp {
  constructor() {
    this.graph = null;
    this.latestState = null;

    this.elements = queryMonitorElements();
    this.zoneDrawer = new ZoneDrawerController({
      elements: this.elements,
      graph: null,
      onZoneSelected: () => this.syncZoneDependentActions(),
    });
    this.fileActivity = new FileActivityController({
      elements: this.elements,
      getState: () => this.latestState,
      onZoneOpen: (zone) => this.zoneDrawer.openDrawer(zone),
    });
    this.matrixModal = new MatrixModalController({
      elements: this.elements,
      graph: null,
      getState: () => this.latestState,
      onZoneOpen: (zone) => this.zoneDrawer.openDrawer(zone),
      onDrawerClose: () => this.zoneDrawer.closeDrawer(),
      showToast: (message) => this.fileActivity.showToast(message),
    });
    this.sseConnection = new SseConnectionController({
      elements: this.elements,
      graph: null,
      onState: (state) => this.applyState(state),
      onActivity: (activity) => this.fileActivity.handleFileActivityHUD(activity),
    });

    this.initGraph();
    this.initEvents();
    this.sseConnection.loadTopologyAndConnect();
  }

  /** Creates the 3D graph facade with dashboard-bound interaction callbacks. */
  initGraph() {
    this.graph = new NeuralGraph(
      this.elements.container,
      (zoneData) => {
        this.zoneDrawer.openDrawer(zoneData);
        this.graph.flyToNode(zoneData.id);
      },
      (fileData) => {
        this.fileActivity.handleFileSelect(fileData);
      },
      (fileData, screenPos) => {
        this.fileActivity.handleFileHover(fileData, screenPos);
      },
    );
    this.zoneDrawer.graph = this.graph;
    this.matrixModal.graph = this.graph;
    this.sseConnection.graph = this.graph;
  }

  /** Registers all global button, drawer, and keyboard listeners. */
  initEvents() {
    const {
      btnResetView,
      btnAutoRotate,
      btnOpenMatrix,
      modalClose,
      drawerClose,
      btnZenMode,
      btnZenExit,
      btnToggleHeatmap,
      btnCamDirector,
    } = this.elements;

    btnResetView.addEventListener("click", () => {
      this.graph.resetCamera();
      if (this.zoneDrawer.isSafeZoneModeActive) this.zoneDrawer.exitSafeZoneMode();
    });

    btnAutoRotate.addEventListener("click", (e) => {
      this.graph.toggleAutoRotate();
      e.currentTarget.classList.toggle("active");
    });

    btnOpenMatrix.addEventListener("click", () => this.matrixModal.openMatrixModal());
    modalClose.addEventListener("click", () => this.matrixModal.closeMatrixModal());
    drawerClose.addEventListener("click", () => this.zoneDrawer.closeDrawer());

    btnZenMode?.addEventListener("click", () => this.matrixModal.toggleZenMode());
    btnZenExit?.addEventListener("click", () => this.matrixModal.toggleZenMode(false));
    btnToggleHeatmap?.addEventListener("click", () => this.matrixModal.toggleHeatmap());
    btnCamDirector?.addEventListener("click", () => this.matrixModal.cycleCameraDirector());

    this.registerKeyboardShortcuts();
    this.registerDrawerActions();
  }

  // Global Keyboard Shortcuts (Press 'H' for Zen, 'M' for Heatmap, 'C' for Cam Director, 'Escape' to restore or close)
  registerKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "h" || e.key === "H") {
        this.matrixModal.toggleZenMode();
      } else if (e.key === "m" || e.key === "M") {
        this.matrixModal.toggleHeatmap();
      } else if (e.key === "c" || e.key === "C") {
        this.matrixModal.cycleCameraDirector();
      } else if (e.key === "Escape") {
        this.handleEscapeKey();
      }
    });
  }

  handleEscapeKey() {
    const { matrixModal, drawer } = this.elements;
    if (this.matrixModal.isZenMode) {
      this.matrixModal.toggleZenMode(false);
    } else if (matrixModal && !matrixModal.classList.contains("hidden")) {
      this.matrixModal.closeMatrixModal();
    } else if (drawer && drawer.classList.contains("open")) {
      this.zoneDrawer.closeDrawer();
    }
  }

  registerDrawerActions() {
    const { btnFindSafeZones, btnCopyClaim } = this.elements;
    btnFindSafeZones.addEventListener("click", () => {
      if (this.zoneDrawer.isSafeZoneModeActive) {
        this.zoneDrawer.exitSafeZoneMode();
      } else {
        this.zoneDrawer.findSafeZones();
      }
    });

    btnCopyClaim.addEventListener("click", () => this.matrixModal.copyClaimCli(this.zoneDrawer.selectedZoneId));
  }

  /** Applies a fresh coordination state snapshot to HUD, drawer, and 3D graph. */
  applyState(state) {
    this.latestState = state;
    this.sseConnection.updateHUD(state);
    this.sseConnection.checkStaleClaims(state);
    this.graph.updateState(state);

    // Re-render drawer if open
    if (this.zoneDrawer.selectedZoneId) {
      const updatedZone = state.zones.find((z) => z.id === this.zoneDrawer.selectedZoneId);
      if (updatedZone) this.zoneDrawer.renderDrawerContent(updatedZone);
    }
  }

  /**
   * Refreshes zone-dependent actions after the selected zone changes.
   * The copy-claim CLI command is derived from the drawer's selected zone id.
   */
  syncZoneDependentActions() {
    // Selection state lives on zoneDrawer; matrixModal.copyClaimCli reads it
    // at click time, so no eager work is required here. Kept as the extension
    // point for future zone-selection reactions.
  }
}
