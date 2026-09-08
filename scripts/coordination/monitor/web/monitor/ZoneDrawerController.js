/**
 * ZoneDrawerController: owns the zone detail drawer — open/close, content
 * rendering, and the safe-zone discovery workflow (fetch + 3D highlighting).
 */

export class ZoneDrawerController {
  /**
   * @param {object} deps
   * @param {import("./domElements.js").ElementMap} deps.elements Dashboard element map.
   * @param {object} deps.graph NeuralGraph instance (3D scene facade).
   * @param {() => void} deps.onZoneSelected Invoked whenever the selected zone id changes.
   */
  constructor({ elements, graph, onZoneSelected }) {
    this.elements = elements;
    this.graph = graph;
    this.onZoneSelected = onZoneSelected;
    this.selectedZoneId = null;
    this.isSafeZoneModeActive = false;
  }

  /** Opens the drawer for a zone and resets any active safe-zone mode. */
  openDrawer(zoneData) {
    this.selectedZoneId = zoneData.id;
    if (this.isSafeZoneModeActive) this.exitSafeZoneMode();
    this.renderDrawerContent(zoneData);
    this.onZoneSelected(this.selectedZoneId);
    this.elements.drawer.classList.add("open");
  }

  /** Closes the drawer and clears the selected zone + safe-zone mode. */
  closeDrawer() {
    this.selectedZoneId = null;
    if (this.isSafeZoneModeActive) this.exitSafeZoneMode();
    this.onZoneSelected(this.selectedZoneId);
    this.elements.drawer.classList.remove("open");
  }

  /** Re-renders drawer tags, description, and claim cards for a zone snapshot. */
  renderDrawerContent(zone) {
    const { drawerTitle, drawerTags, drawerDesc, drawerClaims, btnFindSafeZones, safeZoneResults } = this.elements;

    drawerTitle.textContent = zone.name || zone.id;

    // Tags
    const lockClass = zone.lockPolicy === "shared-disjoint" ? "disjoint" : zone.lockPolicy === "exclusive" ? "exclusive" : "";
    drawerTags.innerHTML = `
      <span class="tag ${zone.risk === "high" ? "high-risk" : ""}">${zone.risk.toUpperCase()} RISK</span>
      <span class="tag ${lockClass}">${zone.lockPolicy.toUpperCase()}</span>
      <span class="tag ${zone.status === "active" ? "high-risk" : ""}">${zone.status.toUpperCase()}</span>
      ${zone.hasStaleHeartbeat ? `<span class="tag high-risk">⚠️ STALE HEARTBEAT</span>` : ""}
    `;

    // Description
    drawerDesc.textContent = zone.description || "No description provided for this zone.";

    // Reset Safe Zone action button
    btnFindSafeZones.textContent = "🎯 Find Safe Zones";
    btnFindSafeZones.classList.remove("active");
    safeZoneResults.innerHTML = "";

    // Claims section
    if (zone.writers && zone.writers.length > 0) {
      drawerClaims.innerHTML = `
        <div class="drawer-section-title">Active Claims (Writers)</div>
        ${this.renderWriters(zone.writers)}
      `;
    } else if (zone.readers && zone.readers.length > 0) {
      drawerClaims.innerHTML = `
        <div class="drawer-section-title">Read-Stable Protections</div>
        ${this.renderReaders(zone.readers)}
      `;
    } else {
      drawerClaims.innerHTML = `
        <div class="claims-card idle">
          <div style="color: var(--accent-cyan); font-weight: 600;">Zone is Available</div>
          <div class="claim-task">No active locks or dependencies on this zone. Ready for agent assignment.</div>
        </div>
      `;
    }
  }

  renderWriters(writers) {
    return writers
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
      `,
      )
      .join("");
  }

  renderReaders(readers) {
    return readers
      .map(
        (r) => `
        <div class="claims-card idle">
          <div><span class="claim-agent" style="color: var(--accent-amber);">${r.agent}</span> (Read-Stable)</div>
          <div class="claim-task">Task: ${r.task}</div>
        </div>
      `,
      )
      .join("");
  }

  /** Fetches safe (concurrently dispatchable) zones for the selected zone and highlights them. */
  async findSafeZones() {
    const { btnFindSafeZones, safeZoneResults } = this.elements;
    if (!this.selectedZoneId) return;

    try {
      btnFindSafeZones.textContent = "⏳ Calculating...";
      const res = await fetch(`/api/safe-zones?zone=${encodeURIComponent(this.selectedZoneId)}`);
      if (!res.ok) throw new Error("Failed to calculate safe zones");
      const data = await res.json();

      this.isSafeZoneModeActive = true;
      btnFindSafeZones.textContent = "❌ Exit Safe-Zone Mode";
      btnFindSafeZones.classList.add("active");

      this.graph.highlightSafeZones(data.targetZone, data.safeZones, data.conflictingZones);

      safeZoneResults.innerHTML = this.renderSafeZoneResults(data);
    } catch (err) {
      console.error(err);
      btnFindSafeZones.textContent = "🎯 Find Safe Zones";
    }
  }

  renderSafeZoneResults(data) {
    const safeTags = data.safeZones.map((z) => `<span class="safe-tag">✔ ${z}</span>`).join("");
    const conflictTags = data.conflictingZones.map((c) => `<span class="conflict-tag">✖ ${c.zone}</span>`).join("");

    return `
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
  }

  /** Clears safe-zone highlighting in the 3D scene and resets the drawer action button. */
  exitSafeZoneMode() {
    this.isSafeZoneModeActive = false;
    const { btnFindSafeZones, safeZoneResults } = this.elements;
    btnFindSafeZones.textContent = "🎯 Find Safe Zones";
    btnFindSafeZones.classList.remove("active");
    safeZoneResults.innerHTML = "";
    this.graph.clearSafeZoneHighlights();
  }
}
