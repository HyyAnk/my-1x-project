# Agent Coordination Scripts Archive

This directory contains archived tools and services originally used for multi-agent lockstep coordination, zone leases, diff validation, and the 3D neural-graph drone monitor.

## Archival Notice

As part of the System Streamlining Master Plan (Phase 3), all agent coordination scripts, CLI wrappers, test suites, and the Three.js 3D monitor have been decommissioned and consolidated into archive bundles:

- **Gzip Tarball:** [`coordination-scripts-archive.tar.gz`](./coordination-scripts-archive.tar.gz)
- **Zip Archive:** [`coordination-scripts-archive.zip`](./coordination-scripts-archive.zip)

Consolidating these tools eliminates redundant developer friction, speeds up workspace indexing, and prevents obsolete coordination commands from polluting repository searches.

---

## Manifest of Archived Assets

The archive contains the following components:

### 1. Root Launchers
- `run-agent-monitor.bat`: Windows launcher for the realtime 3D monitor on port 3344.
- `stop-agent-monitor.bat`: Windows script to terminate background monitor processes.

### 2. Coordination CLI Scripts & Wrappers (`scripts/`)
- `agent-claim.mjs` & `.cmd`: Safe-zone lease acquisition CLI.
- `agent-verify-claim.mjs` & `.cmd`: Active zone claim verification CLI.
- `agent-release.mjs` & `.cmd`: Lease release and diff-check CLI.
- `agent-status.mjs` & `.cmd`: Coordination registry and zone status reporter.
- `agent-heartbeat.mjs` & `.cmd`: Heartbeat keepalive emitter for active leases.
- `agent-expand.mjs` & `.cmd`: Dynamic claim scope expansion tool.
- `agent-queue.mjs` & `.cmd`: Safe-zone conflict queue manager.
- `agent-monitor.cmd`: Wrapper for launching the coordination monitor server.
- `agent-cleanup-stale.mjs` & `.cmd`: Stale lock cleanup utility.
- `agent-rebaseline.mjs` & `.cmd`: Git baseline sync tool for diff guard.
- `agent-validate-zones.mjs` & `.cmd`: Zone manifest syntax and coverage validator.
- `agent-coordination-registry.mjs`: Central metadata registry for coordination services.
- `test-agent-coordination.mjs`: Test runner for coordination unit tests.

### 3. Coordination Subsystem (`scripts/coordination/`)
- **Backend Services:** `claim-service.mjs`, `conflict-checker.mjs`, `diff-guard-service.mjs`, `file-watcher.mjs`, `git-baseline.mjs`, `heartbeat-service.mjs`, `lease-service.mjs`, `queue-service.mjs`, `zone-loader.mjs`, `zone-validator.mjs`, `db.mjs`.
- **Realtime Monitor Server:** `monitor-server.mjs`.
- **3D Neural-Graph Drone Monitor:** Web client located in `monitor/web/` featuring Three.js 3D visualizer, drone squadron states, custom GLSL shaders, and status dashboard.
- **Unit Test Suite:** 14 test modules in `test/`.

---

## Extracting the Archive

To inspect or restore any archived component:

- **Using tar (Command line):**
  ```bash
  # View archive contents
  tar -ztvf scripts/archive/coordination-scripts-archive.tar.gz

  # Extract entire archive into a target folder
  tar -zxvf scripts/archive/coordination-scripts-archive.tar.gz -C <target-dir>

  # Extract a specific file
  tar -zxvf scripts/archive/coordination-scripts-archive.tar.gz -C <target-dir> agent-claim.mjs
  ```

- **Using PowerShell:**
  ```powershell
  Expand-Archive -Path "scripts\archive\coordination-scripts-archive.zip" -DestinationPath "tmp\coordination-backup"
  ```
