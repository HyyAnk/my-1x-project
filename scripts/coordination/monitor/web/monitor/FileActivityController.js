/**
 * FileActivityController: owns the synaptic file-activity ticker, the file
 * micro-neuron hover tooltip, file-node selection handling, and the toast queue.
 */

const TICKER_AUTO_HIDE_MS = 4200;
const TOAST_AUTO_REMOVE_MS = 2100;

export class FileActivityController {
  /**
   * @param {object} deps
   * @param {import("./domElements.js").ElementMap} deps.elements Dashboard element map.
   * @param {() => object} deps.getState Returns the latest coordination state snapshot.
   * @param {(zone: object) => void} deps.onZoneOpen Opens the zone drawer for a selected file's zone.
   */
  constructor({ elements, getState, onZoneOpen }) {
    this.elements = elements;
    this.getState = getState;
    this.onZoneOpen = onZoneOpen;
    this.tickerTimeout = null;
  }

  /** Flashes the synaptic activity ticker for a file activity event payload. */
  handleFileActivityHUD(activity) {
    const { activityTicker, tickerIcon, tickerZone, tickerFile } = this.elements;
    if (!activityTicker || !activity) return;

    const prefix = activity.eventType === "add" ? "+" : activity.eventType === "unlink" ? "✕" : "⚡";
    const agentPrefix = activity.agent ? `[${activity.agent}] ` : "";
    if (tickerIcon) tickerIcon.textContent = prefix;
    if (tickerZone) tickerZone.textContent = activity.zoneId || "";
    const shortFile = activity.fileName || (activity.file ? activity.file.split("/").pop() : "file");
    if (tickerFile) tickerFile.textContent = `${agentPrefix}${shortFile}`;

    activityTicker.classList.remove("hidden");

    if (this.tickerTimeout) clearTimeout(this.tickerTimeout);
    this.tickerTimeout = setTimeout(() => {
      if (activityTicker) {
        activityTicker.classList.add("hidden");
      }
    }, TICKER_AUTO_HIDE_MS);
  }

  /** Shows/hides the file micro-neuron tooltip at a screen position. */
  handleFileHover(fileData, screenPos) {
    const { fileTooltip, fileTooltipName, fileTooltipPath, fileTooltipZone } = this.elements;
    if (!fileTooltip) return;
    if (!fileData) {
      fileTooltip.classList.add("hidden");
      return;
    }
    if (fileTooltipName) fileTooltipName.textContent = fileData.name;
    if (fileTooltipPath) fileTooltipPath.textContent = fileData.path;
    if (fileTooltipZone) fileTooltipZone.textContent = fileData.zoneId;

    if (screenPos) {
      fileTooltip.style.left = `${screenPos.clientX}px`;
      fileTooltip.style.top = `${screenPos.clientY}px`;
    }
    fileTooltip.classList.remove("hidden");
  }

  /** Opens the owning zone drawer and toasts the selected file neuron. */
  handleFileSelect(fileData) {
    if (!fileData) return;
    const state = this.getState();
    const zoneData = state?.zones?.find((z) => z.id === fileData.zoneId);
    if (zoneData) {
      this.onZoneOpen(zoneData);
    }
    this.showToast(`📄 ${fileData.name} (${fileData.zoneId})`);
  }

  /** Queues a transient toast message into the toast container. */
  showToast(message) {
    const { toastContainer } = this.elements;
    const toast = document.createElement("div");
    toast.className = "copy-toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), TOAST_AUTO_REMOVE_MS);
  }

  /** Clears pending timers (used when the dashboard is disposed). */
  dispose() {
    if (this.tickerTimeout) clearTimeout(this.tickerTimeout);
    this.tickerTimeout = null;
  }
}
