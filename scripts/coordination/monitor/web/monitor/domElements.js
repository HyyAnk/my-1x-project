/**
 * Pure DOM element lookup map for the Agent-Monitor dashboard.
 * Extracted from the former `App.initElements()` so controllers can receive
 * a plain element bundle without owning document queries.
 */

const ELEMENT_IDS = {
  container: "canvas-container",
  activeClaimsVal: "val-active-claims",
  activeAgentsVal: "val-active-agents",
  idleZonesVal: "val-idle-zones",
  btnResetView: "btn-reset-view",
  btnAutoRotate: "btn-auto-rotate",
  btnOpenMatrix: "btn-open-matrix",
  drawer: "detail-drawer",
  drawerClose: "drawer-close",
  drawerTitle: "drawer-title",
  drawerTags: "drawer-tags",
  drawerDesc: "drawer-desc",
  drawerClaims: "drawer-claims",
  btnFindSafeZones: "btn-find-safe-zones",
  btnCopyClaim: "btn-copy-claim",
  safeZoneResults: "safe-zone-results",
  staleAlertBanner: "stale-alert-banner",
  staleAlertMsg: "stale-alert-message",
  matrixModal: "matrix-modal",
  modalClose: "modal-close",
  matrixTableBody: "matrix-table-body",
  toastContainer: "toast-container",
  btnZenMode: "btn-zen-mode",
  zenRestoreBar: "zen-restore-bar",
  btnZenExit: "btn-zen-exit",
  btnToggleHeatmap: "btn-toggle-heatmap",
  btnCamDirector: "btn-cam-director",
  activityTicker: "activity-ticker",
  tickerIcon: "ticker-icon",
  tickerZone: "ticker-zone",
  tickerFile: "ticker-file",
  valFileNeurons: "val-file-neurons",
  fileTooltip: "file-tooltip",
  fileTooltipName: "file-tooltip-name",
  fileTooltipPath: "file-tooltip-path",
  fileTooltipZone: "file-tooltip-zone",
};

/**
 * Resolves every dashboard element id into a lookup map.
 * This module performs element queries only; it holds no state and no behavior.
 * @returns {Record<string, HTMLElement>} Map of element key -> DOM node.
 */
export function queryMonitorElements() {
  const elements = {};
  for (const [key, id] of Object.entries(ELEMENT_IDS)) {
    elements[key] = document.getElementById(id);
  }
  return elements;
}
