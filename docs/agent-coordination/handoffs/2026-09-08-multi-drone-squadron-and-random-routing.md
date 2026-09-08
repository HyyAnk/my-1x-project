# Multi-Drone Squadron Per Claim & Stochastic Sphere Routing Handoff Summary

## Status

- Result: completed
- Date: 2026-09-08
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: 42d2ecd79c2a3e1955499764661d05446a3baf46 (236 dirty files recorded from preceding tasks)

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- scripts/coordination/monitor/web/neural-graph.js

## Files Changed

- scripts/coordination/monitor/web/neural-graph.js
- docs/agent-coordination/handoffs/2026-09-08-multi-drone-squadron-and-random-routing.md

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed zones: agent-coordination, coordination-handoffs
- Allowed scope used: scripts/coordination/monitor/web/neural-graph.js, docs/agent-coordination/handoffs/2026-09-08-multi-drone-squadron-and-random-routing.md
- Scope deviations: none

## Decisions

- Decision: Scale the number of active sentinel drones per claim based on claimed red (active write) and yellow (read-stable) spheres.
  - Reason: Fulfills the user request ("với mỗi claim sẽ tạo ra ít nhất 1 agent rồi nhưng tốt nhất là phải tính toán thêm, nếu kích hoạt cứ 2 khối cầu đỏ/vàng thì sẽ tạo ra 1 con, ví dụ 2 khối cầu tạo ra 1 con, 4 khối cầu tạo ra 2 con").
  - Implementation:
    - Formula: `const droneCount = Math.max(1, Math.floor(dutyWaypoints.length / 2));`
    - Guarantees at least 1 drone per claim. For claims spanning 4 spheres, 2 drones spawn; 6 spheres yield 3 drones.
    - Drones are distributed across starting spheres (`startingWpIndex = (dIndex * Math.floor(dutyWaypoints.length / droneCount)) % dutyWaypoints.length`) to patrol different sectors immediately.
- Decision: Unified cyber neon color theme per claim, distinct across claims.
  - Reason: Fulfills user request ("những con tạo ra bởi cùng 1 claim thì sẽ cùng màu, khác claim thì khác màu").
  - Implementation:
    - Maintained `this.claimColorThemeMap = new Map()` in `NeuralCoordinationGraph`.
    - Each claim receives a persistent palette from `DRONE_PALETTES`. All drones belonging to the same claim inherit this identical color palette (eye ring, pupil, accent trims, agent tag, and mega-laser beam). Different claims receive distinct round-robin cyber themes.
- Decision: Independent randomized kinematics and temporal phasing per drone.
  - Reason: Fulfills user request ("Việc animation hoạt động của mỗi drone robot đều sẽ ngẫu nhiên hoàn toàn riêng biệt hoàn toàn không giống nhau").
  - Implementation:
    - Each drone instantiates with independent random seeds (`seedR`, `seedY`, `seedPhase`), distinct orbit radii (`initRadius ± 2.5`), independent wander speeds (`0.007 + Math.random() * 0.006`), random CW/CCW orbit directions, and desynchronized phase timers (`stateStartTime = performance.now() - Math.random() * 1500`, `patrolCyclesAtSphere = Math.floor(Math.random() * 2)`). Drones never move or fire in lockstep.
- Decision: Stochastic sphere selection for inter-sphere transit.
  - Reason: Fulfills user request ("khối cầu di chuyển tới tiếp theo cũng hoàn toàn phải ngẫu nhiên (vẫn nằm trong phạm vi những khối cầu đỏ/vàng thuộc phạm vi claim)").
  - Implementation:
    - Replaced sequential array increment with stochastic selection: `otherWaypoints = drone.dutyWaypoints.filter(wp => wp.zoneId !== drone.currentZoneId)`.
    - Drones randomly jump between red/yellow spheres of their claim while avoiding immediate re-selection of their current sphere when alternatives exist.

## Verification

- Command: `npx prettier --write scripts/coordination/monitor/web/neural-graph.js docs/agent-coordination/handoffs/2026-09-08-multi-drone-squadron-and-random-routing.md`
  - Result: Cleanly formatted with 0 errors.
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: 24 zones valid, 0 definition errors, 0 unmapped files, 0 overlapping files.
- Command: `node --test scripts/coordination/test/*.test.mjs`
  - Result: 57 passed, 0 failed.

## Open Risks

- Risk: None. Lightweight procedural geometries and pre-allocated projectile pools support multi-drone fleets at a sustained 60 FPS.
- Suggested next action: Open `http://127.0.0.1:3344` to monitor the multi-drone sentinel squadrons patrolling claimed zones with stochastic routing.
