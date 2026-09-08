/**
 * SseConnectionController: owns topology bootstrap, the SSE stream lifecycle,
 * HUD metric updates, and stale-claim banner rendering for the dashboard.
 */

export class SseConnectionController {
  /**
   * @param {object} deps
   * @param {import("./domElements.js").ElementMap} deps.elements Dashboard element map.
   * @param {object} deps.graph NeuralGraph instance (3D scene facade).
   * @param {(state: object) => void} deps.onState Applied by the composition root on every state snapshot.
   * @param {() => void} deps.onActivity Invoked for every file_activity SSE event payload.
   */
  constructor({ elements, graph, onState, onActivity }) {
    this.elements = elements;
    this.graph = graph;
    this.onState = onState;
    this.onActivity = onActivity;
    this.evtSource = null;
  }

  /** Loads the zone topology + immediate state snapshot, then starts the SSE stream. */
  async loadTopologyAndConnect() {
    try {
      const res = await fetch("/api/topology");
      if (!res.ok) throw new Error("Failed to load topology");
      const topology = await res.json();
      this.graph.loadTopology(topology);

      if (this.elements.valFileNeurons && topology.files) {
        this.elements.valFileNeurons.textContent = topology.files.length.toLocaleString();
      }

      // Fetch immediate active state so UI and drones appear immediately without waiting for SSE stream event
      try {
        const stateRes = await fetch("/api/state");
        if (stateRes.ok) {
          const state = await stateRes.json();
          this.onState(state);
        }
      } catch {
        // The monitor reconnect loop handles transient state-fetch failures.
      }

      this.connectSSE();
    } catch (err) {
      console.error("Topology init error:", err);
    }
  }

  /** (Re)opens the /api/stream EventSource and dispatches its events. */
  connectSSE() {
    if (this.evtSource) this.evtSource.close();
    this.evtSource = new EventSource("/api/stream");

    this.evtSource.addEventListener("state", (e) => {
      try {
        const state = JSON.parse(e.data);
        this.onState(state);
      } catch (err) {
        console.error("Failed to parse state stream:", err);
      }
    });

    this.evtSource.addEventListener("file_activity", (e) => {
      try {
        const activity = JSON.parse(e.data);
        if (this.graph) {
          this.graph.triggerFileActivity(activity);
        }
        this.onActivity(activity);
      } catch (err) {
        console.error("Failed to parse file_activity event:", err);
      }
    });

    this.evtSource.onerror = () => {
      console.warn("SSE connection lost, retrying in 3s...");
      setTimeout(() => this.connectSSE(), 3000);
    };
  }

  /** Renders the top-bar HUD metric values from a coordination state snapshot. */
  updateHUD(state) {
    if (!state || !state.summary) return;
    this.elements.activeClaimsVal.textContent = state.summary.totalActiveClaims;
    this.elements.activeAgentsVal.textContent = state.summary.activeAgents.join(", ") || "None";
    this.elements.idleZonesVal.textContent = `${state.summary.idleZones}/${state.summary.totalZones}`;
  }

  /** Shows/hides the stale-claim alert banner based on dead claims in the snapshot. */
  checkStaleClaims(state) {
    const deadClaims = (state.claims || []).filter((c) => c.isDead);
    if (deadClaims.length > 0) {
      const dead = deadClaims[0];
      this.elements.staleAlertMsg.textContent = `⚠️ Stale claim detected: "${dead.id}" (Agent: ${dead.agent}, timeout: ${dead.deadReason || "no heartbeat"}). Release recommended.`;
      this.elements.staleAlertBanner.classList.remove("hidden");
      document.body.classList.add("has-stale-banner");
    } else {
      this.elements.staleAlertBanner.classList.add("hidden");
      document.body.classList.remove("has-stale-banner");
    }
  }

  /** Tears down the SSE stream (used when the dashboard is disposed). */
  disconnect() {
    if (this.evtSource) this.evtSource.close();
    this.evtSource = null;
  }
}
