# AI Quiz Studio

> **Note:** This is a personal project developed and supported exclusively for **Windows**. Other operating systems are not supported.

**AI Quiz Studio** is a local-first production studio for AI quiz content. Landscape Episodes run from curated questions and director planning through images, Chatterbox Turbo narration, timeline compilation, and final MP4 rendering.

**Short Reels** prepare 9:16 scripts, references, covers, publishing copy, and export packages for separate video production. They do not render a Short Reel MP4 in this workflow.

---

## Key Features

- **Multi-Format Quiz Gameplay:** Built-in archetypes including Deep Trivia, True or False, Split Versus 1v1, Odd One Out, Visual Identification, Speed Blitz, and Mystery Reveal.
- **Reusable Question Bank:** Curated source question repository with deficit-aware matrix planning, entity mapping, and automated localization while preserving English source identity.
- **Channel DNA & Style Presets:** Define channel identity, target age bands (4–6, 7–9, 10–12, family), visual styles, voice pacing, and mascot character styling across episodes.
- **Quiz Engine V2:** Modern, quiz-native production pipeline that generates and validates canonical artifacts (`quiz-v2.json`, `director-plan.json`, `asset-plan.json`, `voice-plan.json`, `timeline.json`) before rendering.
- **Dual LLM Engine Support:** Native toggle between **OpenAI Codex** and **Google Antigravity** with real-time thinking-step streaming via WebSocket.
- **Local TTS Audio Engine:** Bundled Chatterbox Turbo sidecar providing expressive, high-quality voiceover with conversational pause cues and paralinguistic tag support (`[chuckle]`, `[laugh]`).
- **Automated Video Rendering & QA:** Deterministic timeline assembly, pre-render layout collision checks, automated WCAG contrast healing, and MP4 video compilation.
- **Local-First Architecture:** Channel content lives in `channels/`, and runtime states, logs, and task queues live in `.quiz-studio/`.

---

## Requirements

- **Operating System:** Windows 10 / 11 (64-bit)
- **Node.js:** v20+ (v22+ recommended)
- **pnpm:** v9+
- **Python:** 3.10+ (required for local Chatterbox TTS voice service)

---

## Installation & Getting Started

### 1. One-Click Startup (Recommended)

Run the startup batch script in the project root:

```cmd
"run dashboard.bat"
```

This launcher verifies required dependencies (Node.js, Python, pnpm), initializes the Python virtual environment, starts the Chatterbox Turbo TTS service, and launches the web dashboard at `http://127.0.0.1:2244`.

To cleanly stop all local services:

```cmd
"stop dashboard.bat"
```

### 2. Manual Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Build shared packages:**

   ```bash
   pnpm build:shared
   ```

3. **Start development server:**

   ```bash
   pnpm dev
   ```

4. **Build & Run production:**

   ```bash
   pnpm build
   pnpm start
   ```

---

## Repository Structure

```text
├── apps/
│   ├── server/       # Fastify backend, TaskManager, Quiz V2 pipeline, provider adapters
│   └── web/          # React 19 + Vite dashboard, Stage Studio, Short Reel editor
├── packages/
│   └── shared/       # Shared TypeScript types, Zod schemas, quiz layout catalogs
├── services/
│   └── tts/          # Python FastAPI sidecar for Chatterbox Turbo TTS
├── channels/         # Local channel configurations, DNA, and episode content
├── templates/        # Quiz Channel DNA templates and style guides
├── docs/             # Technical architecture and domain documentation
└── .quiz-studio/     # Local runtime configuration, task states, cache, and logs
```

---

## Architecture & Documentation

For in-depth technical documentation, refer to:

- [Documentation Index](docs/README.md): Overview of all system guides.
- [System Architecture](docs/architecture.md): Implementation boundaries, runtime contracts, and data flow.
- [Quiz Engine V2](docs/quiz-engine-v2.md): Pipeline stages, QA healing, and video rendering contracts.
- [Question Bank & Topics](docs/question-bank.md): Source question curation, eligibility, and receipts.
- [Short Reels](docs/short-reel.md): portrait production assets and export packaging.
- [LLM Engine Integration](docs/codex-integration.md): Codex and Google Antigravity integration details.
- [Setup & Troubleshooting](docs/setup.md): Detailed local configuration and troubleshooting runbooks.
- [Repository Rules (AGENTS.md)](AGENTS.md): Architectural rules and coding standards.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
