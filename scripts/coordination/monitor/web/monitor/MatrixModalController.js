/**
 * MatrixModalController: owns the Work Allocation Matrix modal, the copy-claim-CLI
 * action, and the presentation toggles (zen mode, heatmap, camera director).
 * Also hosts the legacy `toggleDemoDrone` (dead call site, preserved verbatim).
 */

export class MatrixModalController {
  /**
   * @param {object} deps
   * @param {import("./domElements.js").ElementMap} deps.elements Dashboard element map.
   * @param {object} deps.graph NeuralGraph instance (3D scene facade).
   * @param {() => object} deps.getState Returns the latest coordination state snapshot.
   * @param {(zone: object) => void} deps.onZoneOpen Opens the drawer for a zone (after modal close).
   * @param {() => void} deps.onDrawerClose Closes the zone drawer (for zen-mode cleanup).
   * @param {(message: string) => void} deps.showToast Displays a transient toast message.
   */
  constructor({ elements, graph, getState, onZoneOpen, onDrawerClose, showToast }) {
    this.elements = elements;
    this.graph = graph;
    this.getState = getState;
    this.onZoneOpen = onZoneOpen;
    this.onDrawerClose = onDrawerClose;
    this.showToast = showToast;
    this.isZenMode = false;
  }

  /** Copies a ready-to-run agent-claim CLI command for the selected zone to the clipboard. */
  copyClaimCli(selectedZoneId) {
    if (!selectedZoneId) return;
    const cmd = `node scripts/agent-claim.mjs --agent agent-${Date.now().toString(36).slice(-3)} --task "Work on ${selectedZoneId}" --write "${selectedZoneId}" --json`;
    navigator.clipboard.writeText(cmd).then(() => {
      this.showToast("📋 Claim CLI command copied to clipboard!");
    });
  }

  /** Builds the work matrix table from the latest state and reveals the modal. */
  openMatrixModal() {
    const state = this.getState();
    if (!state || !state.zones) return;
    const { matrixTableBody, matrixModal } = this.elements;

    matrixTableBody.innerHTML = state.zones.map((z) => this.renderMatrixRow(z)).join("");

    // Add row click listener to jump in 3D
    matrixTableBody.querySelectorAll("tr").forEach((row) => {
      row.addEventListener("click", () => {
        const zoneId = row.getAttribute("data-zone");
        const zone = state.zones.find((z) => z.id === zoneId);
        if (zone) {
          this.closeMatrixModal();
          this.onZoneOpen(zone);
          this.graph.flyToNode(zoneId);
        }
      });
    });

    matrixModal.classList.remove("hidden");
  }

  renderMatrixRow(z) {
    const writers =
      z.writers && z.writers.length > 0
        ? z.writers
            .map((w) => {
              const fileInfo =
                w.plannedFiles && w.plannedFiles.length > 0 ? ` (${w.plannedFiles.length} files)` : w.task ? ` (${w.task})` : "";
              return `${w.agent}${fileInfo}`;
            })
            .join(", ")
        : "-";
    const statusColor =
      z.status === "active" ? "var(--accent-magenta)" : z.status === "read_stable" ? "var(--accent-amber)" : "var(--accent-green)";
    const lockTag =
      z.lockPolicy === "shared-disjoint"
        ? `<span class="tag disjoint">SHARED-DISJOINT</span>`
        : `<span class="tag exclusive">${z.lockPolicy.toUpperCase()}</span>`;
    return `
        <tr data-zone="${z.id}">
          <td style="font-weight: 600; color: var(--text-primary);">${z.name || z.id}</td>
          <td><code>${z.id}</code></td>
          <td><span class="tag ${z.risk === "high" ? "high-risk" : ""}">${z.risk}</span></td>
          <td>${lockTag}</td>
          <td><span style="color: ${statusColor}; font-weight: 700;">● ${z.status.toUpperCase()}</span></td>
          <td>${writers}</td>
        </tr>
      `;
  }

  /** Hides the work matrix modal. */
  closeMatrixModal() {
    this.elements.matrixModal.classList.add("hidden");
  }

  /** Toggles the zen panorama view (optionally forced on/off). */
  toggleZenMode(forceState) {
    const { matrixModal, drawer, zenRestoreBar, btnZenMode } = this.elements;
    this.isZenMode = typeof forceState === "boolean" ? forceState : !this.isZenMode;
    document.body.classList.toggle("zen-mode", this.isZenMode);
    if (zenRestoreBar) {
      zenRestoreBar.classList.toggle("hidden", !this.isZenMode);
    }
    if (btnZenMode) {
      btnZenMode.classList.toggle("active", this.isZenMode);
    }

    if (this.isZenMode) {
      if (matrixModal && !matrixModal.classList.contains("hidden")) {
        this.closeMatrixModal();
      }
      if (drawer && drawer.classList.contains("open")) {
        this.onDrawerClose();
      }
      this.showToast("🌌 Zen Panorama View (Press 'H' or 'Esc' to restore)");
    } else {
      this.showToast("⚡ Standard HUD Restored");
    }
  }

  /** Toggles the synaptic activity heatmap (optionally forced on/off). */
  toggleHeatmap(forceState) {
    if (!this.graph) return;
    const isHeatmap = this.graph.toggleHeatmap(forceState);
    const { btnToggleHeatmap } = this.elements;
    if (btnToggleHeatmap) {
      btnToggleHeatmap.classList.toggle("active", isHeatmap);
    }
    this.showToast(isHeatmap ? "🔥 Synaptic Heatmap: ACTIVE" : "❄️ Standard Neural View");
  }

  /** Cycles to the next cinematic camera director mode. */
  cycleCameraDirector() {
    if (!this.graph) return;
    const modeName = this.graph.cycleCameraMode();
    const { btnCamDirector } = this.elements;
    if (btnCamDirector) {
      btnCamDirector.textContent = `🎥 ${modeName}`;
    }
    this.showToast(`Camera: ${modeName}`);
  }

  /**
   * Legacy demo-drone toggle. `graph.toggleDemoDrone()` does NOT exist on the
   * current NeuralGraph facade and `btnDemoDrone` is not bound in index.html —
   * preserved verbatim as a harmless dead call site (never invoked).
   */
  toggleDemoDrone(onFileActivity) {
    if (!this.graph) return;
    const isActive = this.graph.toggleDemoDrone();
    if (this.elements.btnDemoDrone) {
      this.elements.btnDemoDrone.classList.toggle("active", isActive);
    }
    this.showToast(isActive ? "🤖 Demo Cyber Drone: ACTIVE (Focusing shared-contracts)" : "🤖 Demo Cyber Drone: DEACTIVATED");
    if (isActive) {
      onFileActivity({
        zoneId: "shared-contracts",
        fileName: "Cyber-Scout Inspection & Repair Active (Shortcut: D)",
        eventType: "add",
        agent: "Cyber-Scout",
      });
    }
  }
}
