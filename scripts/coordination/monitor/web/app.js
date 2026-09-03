import { NeuralGraph } from "./neural-graph.js";

class App {
  constructor() {
    this.graph = null;
    this.evtSource = null;
    this.selectedZoneId = null;
    this.latestState = null;
    this.isSafeZoneModeActive = false;

    this.initElements();
    this.initGraph();
    this.initEvents();
    this.loadTopologyAndConnect();
  }

  initElements() {
    this.container = document.getElementById("canvas-container");
    this.activeClaimsVal = document.getElementById("val-active-claims");
    this.activeAgentsVal = document.getElementById("val-active-agents");
    this.idleZonesVal = document.getElementById("val-idle-zones");
    this.btnResetView = document.getElementById("btn-reset-view");
    this.btnAutoRotate = document.getElementById("btn-auto-rotate");
    this.btnOpenMatrix = document.getElementById("btn-open-matrix");
    this.drawer = document.getElementById("detail-drawer");
    this.drawerClose = document.getElementById("drawer-close");
    this.drawerTitle = document.getElementById("drawer-title");
    this.drawerTags = document.getElementById("drawer-tags");
    this.drawerDesc = document.getElementById("drawer-desc");
    this.drawerClaims = document.getElementById("drawer-claims");
    this.btnFindSafeZones = document.getElementById("btn-find-safe-zones");
    this.btnCopyClaim = document.getElementById("btn-copy-claim");
    this.safeZoneResults = document.getElementById("safe-zone-results");
    this.staleAlertBanner = document.getElementById("stale-alert-banner");
    this.staleAlertMsg = document.getElementById("stale-alert-message");
    this.matrixModal = document.getElementById("matrix-modal");
    this.modalClose = document.getElementById("modal-close");
    this.matrixTableBody = document.getElementById("matrix-table-body");
    this.toastContainer = document.getElementById("toast-container");
    this.btnZenMode = document.getElementById("btn-zen-mode");
    this.zenRestoreBar = document.getElementById("zen-restore-bar");
    this.btnZenExit = document.getElementById("btn-zen-exit");
    this.isZenMode = false;
  }

  initGraph() {
    this.graph = new NeuralGraph(this.container, (zoneData) => {
      this.openDrawer(zoneData);
      this.graph.flyToNode(zoneData.id);
    });
  }

  initEvents() {
    this.btnResetView.addEventListener("click", () => {
      this.graph.resetCamera();
      if (this.isSafeZoneModeActive) this.exitSafeZoneMode();
    });

    this.btnAutoRotate.addEventListener("click", (e) => {
      this.graph.toggleAutoRotate();
      e.currentTarget.classList.toggle("active");
    });

    this.btnOpenMatrix.addEventListener("click", () => this.openMatrixModal());
    this.modalClose.addEventListener("click", () => this.closeMatrixModal());
    this.drawerClose.addEventListener("click", () => this.closeDrawer());

    this.btnZenMode?.addEventListener("click", () => this.toggleZenMode());
    this.btnZenExit?.addEventListener("click", () => this.toggleZenMode(false));

    // Global Keyboard Shortcuts (Press 'H' for Zen Mode, 'Escape' to restore or close modals)
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "h" || e.key === "H") {
        this.toggleZenMode();
      } else if (e.key === "Escape") {
        if (this.isZenMode) {
          this.toggleZenMode(false);
        } else if (this.matrixModal && !this.matrixModal.classList.contains("hidden")) {
          this.closeMatrixModal();
        } else if (this.drawer && this.drawer.classList.contains("open")) {
          this.closeDrawer();
        }
      }
    });

    this.btnFindSafeZones.addEventListener("click", () => {
      if (this.isSafeZoneModeActive) {
        this.exitSafeZoneMode();
      } else {
        this.findSafeZones();
      }
    });

    this.btnCopyClaim.addEventListener("click", () => this.copyClaimCli());
  }

  async loadTopologyAndConnect() {
    try {
      const res = await fetch("/api/topology");
      if (!res.ok) throw new Error("Failed to load topology");
      const topology = await res.json();
      this.graph.loadTopology(topology);

      this.connectSSE();
    } catch (err) {
      console.error("Topology init error:", err);
    }
  }

  connectSSE() {
    if (this.evtSource) this.evtSource.close();
    this.evtSource = new EventSource("/api/stream");

    this.evtSource.addEventListener("state", (e) => {
      try {
        const state = JSON.parse(e.data);
        this.latestState = state;
        this.updateHUD(state);
        this.checkStaleClaims(state);
        this.graph.updateState(state);

        // Re-render drawer if open
        if (this.selectedZoneId) {
          const updatedZone = state.zones.find((z) => z.id === this.selectedZoneId);
          if (updatedZone) this.renderDrawerContent(updatedZone);
        }
      } catch (err) {
        console.error("Failed to parse state stream:", err);
      }
    });

    this.evtSource.onerror = () => {
      console.warn("SSE connection lost, retrying in 3s...");
      setTimeout(() => this.connectSSE(), 3000);
    };
  }

  updateHUD(state) {
    if (!state || !state.summary) return;
    this.activeClaimsVal.textContent = state.summary.totalActiveClaims;
    this.activeAgentsVal.textContent = state.summary.activeAgents.join(", ") || "None";
    this.idleZonesVal.textContent = `${state.summary.idleZones}/${state.summary.totalZones}`;
  }

  checkStaleClaims(state) {
    const deadClaims = (state.claims || []).filter((c) => c.isDead);
    if (deadClaims.length > 0) {
      const dead = deadClaims[0];
      this.staleAlertMsg.textContent = `⚠️ Stale claim detected: "${dead.id}" (Agent: ${dead.agent}, timeout: ${dead.deadReason || "no heartbeat"}). Release recommended.`;
      this.staleAlertBanner.classList.remove("hidden");
      document.body.classList.add("has-stale-banner");
    } else {
      this.staleAlertBanner.classList.add("hidden");
      document.body.classList.remove("has-stale-banner");
    }
  }

  openDrawer(zoneData) {
    this.selectedZoneId = zoneData.id;
    if (this.isSafeZoneModeActive) this.exitSafeZoneMode();
    this.renderDrawerContent(zoneData);
    this.drawer.classList.add("open");
  }

  closeDrawer() {
    this.selectedZoneId = null;
    if (this.isSafeZoneModeActive) this.exitSafeZoneMode();
    this.drawer.classList.remove("open");
  }

  renderDrawerContent(zone) {
    this.drawerTitle.textContent = zone.name || zone.id;

    // Tags
    this.drawerTags.innerHTML = `
      <span class="tag ${zone.risk === "high" ? "high-risk" : ""}">${zone.risk.toUpperCase()} RISK</span>
      <span class="tag">${zone.lockPolicy.toUpperCase()}</span>
      <span class="tag ${zone.status === "active" ? "high-risk" : ""}">${zone.status.toUpperCase()}</span>
      ${zone.hasStaleHeartbeat ? `<span class="tag high-risk">⚠️ STALE HEARTBEAT</span>` : ""}
    `;

    // Description
    this.drawerDesc.textContent = zone.description || "No description provided for this zone.";

    // Reset Safe Zone action button
    this.btnFindSafeZones.textContent = "🎯 Find Safe Zones";
    this.btnFindSafeZones.classList.remove("active");
    this.safeZoneResults.innerHTML = "";

    // Claims section
    if (zone.writers && zone.writers.length > 0) {
      const writersHtml = zone.writers
        .map(
          (w) => `
        <div class="claims-card ${w.isDead ? "stale" : ""}">
          <div><span class="claim-agent">${w.agent}</span> (Claim: <code>${w.id}</code>) ${w.isDead ? "⚠️ DEAD" : ""}</div>
          <div class="claim-task">Task: ${w.task}</div>
          ${
            w.plannedFiles && w.plannedFiles.length > 0
              ? `<ul class="file-list">${w.plannedFiles.map((f) => `<li>• ${f}</li>`).join("")}</ul>`
              : `<div class="claim-task"><i>Whole zone lock (no individual file restriction)</i></div>`
          }
        </div>
      `
        )
        .join("");
      this.drawerClaims.innerHTML = `
        <div class="drawer-section-title">Active Claims (Writers)</div>
        ${writersHtml}
      `;
    } else if (zone.readers && zone.readers.length > 0) {
      const readersHtml = zone.readers
        .map(
          (r) => `
        <div class="claims-card idle">
          <div><span class="claim-agent" style="color: var(--accent-amber);">${r.agent}</span> (Read-Stable)</div>
          <div class="claim-task">Task: ${r.task}</div>
        </div>
      `
        )
        .join("");
      this.drawerClaims.innerHTML = `
        <div class="drawer-section-title">Read-Stable Protections</div>
        ${readersHtml}
      `;
    } else {
      this.drawerClaims.innerHTML = `
        <div class="claims-card idle">
          <div style="color: var(--accent-cyan); font-weight: 600;">Zone is Available</div>
          <div class="claim-task">No active locks or dependencies on this zone. Ready for agent assignment.</div>
        </div>
      `;
    }
  }

  async findSafeZones() {
    if (!this.selectedZoneId) return;

    try {
      this.btnFindSafeZones.textContent = "⏳ Calculating...";
      const res = await fetch(`/api/safe-zones?zone=${encodeURIComponent(this.selectedZoneId)}`);
      if (!res.ok) throw new Error("Failed to calculate safe zones");
      const data = await res.json();

      this.isSafeZoneModeActive = true;
      this.btnFindSafeZones.textContent = "❌ Exit Safe-Zone Mode";
      this.btnFindSafeZones.classList.add("active");

      this.graph.highlightSafeZones(data.targetZone, data.safeZones, data.conflictingZones);

      const safeTags = data.safeZones.map((z) => `<span class="safe-tag">✔ ${z}</span>`).join("");
      const conflictTags = data.conflictingZones.map((c) => `<span class="conflict-tag">✖ ${c.zone}</span>`).join("");

      this.safeZoneResults.innerHTML = `
        <div class="safe-zone-card">
          <div class="safe-zone-title">⚡ ${data.safeZones.length} Safe Disjoint Zones</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
            You can concurrently dispatch another agent to any of these zones without lock collision:
          </div>
          <div class="safe-zone-list">${safeTags}</div>
          ${
            data.conflictingZones.length > 0
              ? `
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.6rem;">Conflicting Zones (${data.conflictingZones.length}):</div>
            <div class="safe-zone-list">${conflictTags}</div>
          `
              : ""
          }
        </div>
      `;
    } catch (err) {
      console.error(err);
      this.btnFindSafeZones.textContent = "🎯 Find Safe Zones";
    }
  }

  exitSafeZoneMode() {
    this.isSafeZoneModeActive = false;
    this.btnFindSafeZones.textContent = "🎯 Find Safe Zones";
    this.btnFindSafeZones.classList.remove("active");
    this.safeZoneResults.innerHTML = "";
    this.graph.clearSafeZoneHighlights();
  }

  copyClaimCli() {
    if (!this.selectedZoneId) return;
    const cmd = `node scripts/agent-claim.mjs --agent agent-${Date.now().toString(36).slice(-3)} --task "Work on ${this.selectedZoneId}" --write "${this.selectedZoneId}" --json`;
    navigator.clipboard.writeText(cmd).then(() => {
      this.showToast("📋 Claim CLI command copied to clipboard!");
    });
  }

  openMatrixModal() {
    if (!this.latestState || !this.latestState.zones) return;

    this.matrixTableBody.innerHTML = this.latestState.zones
      .map((z) => {
        const writers = z.writers && z.writers.length > 0 ? z.writers.map((w) => w.agent).join(", ") : "-";
        const statusColor =
          z.status === "active" ? "var(--accent-magenta)" : z.status === "read_stable" ? "var(--accent-amber)" : "var(--accent-green)";
        return `
        <tr data-zone="${z.id}">
          <td style="font-weight: 600; color: var(--text-primary);">${z.name || z.id}</td>
          <td><code>${z.id}</code></td>
          <td><span class="tag ${z.risk === "high" ? "high-risk" : ""}">${z.risk}</span></td>
          <td>${z.lockPolicy}</td>
          <td><span style="color: ${statusColor}; font-weight: 700;">● ${z.status.toUpperCase()}</span></td>
          <td>${writers}</td>
        </tr>
      `;
      })
      .join("");

    // Add row click listener to jump in 3D
    this.matrixTableBody.querySelectorAll("tr").forEach((row) => {
      row.addEventListener("click", () => {
        const zoneId = row.getAttribute("data-zone");
        const zone = this.latestState.zones.find((z) => z.id === zoneId);
        if (zone) {
          this.closeMatrixModal();
          this.openDrawer(zone);
          this.graph.flyToNode(zoneId);
        }
      });
    });

    this.matrixModal.classList.remove("hidden");
  }

  closeMatrixModal() {
    this.matrixModal.classList.add("hidden");
  }

  toggleZenMode(forceState) {
    this.isZenMode = typeof forceState === "boolean" ? forceState : !this.isZenMode;
    document.body.classList.toggle("zen-mode", this.isZenMode);
    if (this.zenRestoreBar) {
      this.zenRestoreBar.classList.toggle("hidden", !this.isZenMode);
    }
    if (this.btnZenMode) {
      this.btnZenMode.classList.toggle("active", this.isZenMode);
    }

    if (this.isZenMode) {
      if (this.matrixModal && !this.matrixModal.classList.contains("hidden")) {
        this.closeMatrixModal();
      }
      if (this.drawer && this.drawer.classList.contains("open")) {
        this.closeDrawer();
      }
      this.showToast("🌌 Zen Panorama View (Press 'H' or 'Esc' to restore)");
    } else {
      this.showToast("⚡ Standard HUD Restored");
    }
  }

  showToast(message) {
    const toast = document.createElement("div");
    toast.className = "copy-toast";
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2100);
  }
}

// Boot application reliably
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", () => {
    window.__app = new App();
  });
} else {
  window.__app = new App();
}
