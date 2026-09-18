# Clue Deduction Complete Eradication Runbook

## Overview

This directory houses the authoritative technical documentation, work breakdown structure (WBS), and phase-by-phase execution directives for completely removing the **Clue Deduction** (`clue_deduction`) archetype and layout from the entire system.

## Architectural Goal

Reduce the system from 8 production layouts / archetypes to **7 high-performing, 100% automatable archetypes**:
1. `deep_trivia` (Deep Trivia: 1 hero + 3 choices)
2. `visual_spotting` (Visual Spotting: 3 pure visual choices, odd-one-out)
3. `verdict_true_false` (True or False: 2 binary choices with background hero)
4. `versus_faceoff` (1v1 Face-off: split screen 2 choices)
5. `visual_identification` (Visual ID: 3 labeled visual cards)
6. `speed_blitz` (Speed Blitz: rapid reflex full stack list)
7. `mystery_reveal` (Mystery Reveal: silhouette / laser scanner reveal)

## Phase Breakdown

- **Phase 1**: [Question Bank, AI Prompts & Matrix](01-question-bank-prompts.md)
- **Phase 2**: [Core Shared Schemas, Enums & Domain Contracts](02-shared-schemas-contracts.md)
- **Phase 3**: [Video Engine, Director Plan & Server Render Layouts](03-video-engine-render-layouts.md)
- **Phase 4**: [Web UI - Question Bank, Topic Confirmation & Wireframes](04-web-question-bank-wireframes.md)
- **Phase 5**: [Web UI - Stage Studio, Sandbox & Layout Catalogs](05-web-stage-studio-sandbox.md)
- **Phase 6**: [Test Suites & Snapshots Clean-up & Migration](06-tests-and-snapshots.md)
- **Final Audit**: Full TypeScript compilation, Vitest test suites, and repository-wide 0-match grep audit.

## Execution Rules

1. Each phase is executed by a dedicated subagent sequentially.
2. The subagent inspects target files, implements the changes strictly in English, tests local validity, and reports full results to the main orchestrator.
3. No phase proceeds until the previous phase has reported complete success.
