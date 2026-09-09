# Agent Phase Handoffs

This directory contains active and upcoming agent handoff summaries for current operational cycles.

## Historical Archive Notice

All 344 historical agent handoff summaries (spanning Phases 0 through 5, Refactor Waves 1 through 3, Short-Reel implementation repairs, and Bank/Topic workflows) have been consolidated into single archive packages under `docs/agent-coordination/archive/`:

- **Gzip Tarball (Git-tracked):** [`docs/agent-coordination/archive/handoffs-archive.tar.gz`](../archive/handoffs-archive.tar.gz)
- **Zip Archive:** [`docs/agent-coordination/archive/handoffs-archive.zip`](../archive/handoffs-archive.zip)

This consolidation prevents hundreds of legacy markdown files from polluting full-codebase searches (such as ripgrep, find, and CodeGraph indexers) and keeps the repository lightweight and responsive.

### Extracting or Inspecting Archived Handoffs

To search or extract historical handoffs on demand:

- **Using tar (Command line):**
  ```bash
  # List contents:
  tar -tf docs/agent-coordination/archive/handoffs-archive.tar.gz

  # Extract a specific handoff:
  tar -xzf docs/agent-coordination/archive/handoffs-archive.tar.gz -C <target-dir> <filename>
  ```
- **Using zip (PowerShell / Windows Explorer):**
  ```powershell
  Expand-Archive -Path "docs/agent-coordination/archive/handoffs-archive.zip" -DestinationPath "tmp/legacy-handoffs"
  ```

## Working Protocol for Current & Future Agents

1. **One Summary per Milestone / Phase:** When completing a major phase, repair task, or refactor wave, create exactly one concise handoff document in this directory.
2. **Use Template:** Follow the standardized template at [`docs/agent-coordination/templates/phase-handoff-summary.md`](../templates/phase-handoff-summary.md).
3. **Strict English Only:** All handoffs must be written strictly in English in accordance with repository architectural rules (`AGENTS.md` and `.agents/rules/english-only.md`).
4. **Lifecycle & Cleanup:** When a milestone cycle completes and its final integration report is accepted, consolidate old handoff files into the archive to maintain a clutter-free working directory.
