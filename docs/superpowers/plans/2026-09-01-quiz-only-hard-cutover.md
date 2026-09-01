# Quiz-Only Hard Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the retired production branch and product namespace, leaving one verified Quiz workflow with an independent future path for channel grouping.

**Architecture:** Remove production-mode decisions from the presentation, application, domain, repository, and server pipeline layers in that order, then remove the obsolete contract fields once no consumer depends on them. Consolidate useful preproduction work into a Quiz-only orchestrator, migrate both local runtime directories to `.quiz-studio`, and enforce the result with a tracked-source audit.

**Tech Stack:** TypeScript 5.7, React 19, Fastify 5, Zod 3, Vitest 2, Playwright, Node.js, PowerShell, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-09-01-quiz-only-hard-cutover-design.md`

## Global Constraints

- Preserve the user's unrelated changes in `packages/shared/src/schemas/episode.ts`, `packages/shared/src/schemas/index.ts`, and `packages/shared/src/schemas/thumbnail.ts`; never stage or overwrite them.
- Do not rewrite Git history and do not add a runtime compatibility alias for the retired namespace.
- Keep `language`, `country`, and `market` as independent grouping inputs; do not introduce a speculative collection subsystem.
- Keep the exact responsive footer strings `Develop - Design - Deliver by HyyAnk | Dư Ngọc Minh Hoàng` and `HyyAnk | Dư Ngọc Minh Hoàng`.
- Do not add production dependencies.
- Use `apply_patch` for source edits, preserve focused module boundaries, and keep every behavior change covered by a failing test or a failing architecture audit first.
- Browser verification must use Playwright or the browser protocol, never OS-level mouse, keyboard, clipboard, or coordinate automation.
- Runtime migration is Windows-only, must log timestamped `[INFO]`, `[STEP]`, `[OK]`, and `[ERROR]` labels, and must validate exact absolute paths before any recursive move.

---

### Task 1: Make channel creation a single Quiz flow

**Files:**
- Create: `apps/web/src/features/channel/components/CreateChannelModal.test.tsx`
- Modify: `apps/web/src/features/channel/components/CreateChannelModal.tsx`
- Modify: `apps/web/src/components/channel/ChannelsListView.tsx`
- Modify: `apps/web/src/components/ChannelList.tsx`
- Modify: `apps/web/src/components/ChannelView.tsx`
- Modify: `apps/web/src/components/AppViewRouter.tsx`
- Modify: `apps/web/src/components/AppViewRouter.test.tsx`
- Modify: `apps/web/src/components/AppModals.tsx`
- Modify: `apps/web/src/hooks/useSystemUiState.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/i18n/locales/en/channels.ts`
- Modify: `apps/web/src/i18n/locales/vi/channels.ts`
- Modify: `apps/web/src/styles/features/channels/channelModal.css`

**Interfaces:**
- Consumes: existing `api.createChannel(body: unknown)` and `Task` response contract.
- Produces: `requestCreateChannel(): void`, `showCreate: boolean`, and a modal submission payload containing identity/locale/audience/DNA fields only.

- [ ] **Step 1: Write the failing modal tests**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../api";
import { LanguageProvider } from "../../../i18n";
import { CreateChannelModal } from "./CreateChannelModal";

afterEach(() => vi.restoreAllMocks());

function renderModal(onCreated = vi.fn().mockResolvedValue(undefined)) {
  render(
    <LanguageProvider>
      <CreateChannelModal onClose={vi.fn()} onCreated={onCreated} onError={vi.fn()} />
    </LanguageProvider>,
  );
  return { onCreated };
}

describe("CreateChannelModal", () => {
  it("shows one creation flow and submits no channel-type field", async () => {
    const create = vi.spyOn(api, "createChannel").mockResolvedValue({
      channel: { channel_id: "ch_quiz" } as never,
      task: null,
    });
    renderModal();

    expect(screen.queryByText("Channel Track / Type")).toBeNull();
    fireEvent.change(screen.getByLabelText("Channel Name"), { target: { value: "Brain Bites" } });
    fireEvent.click(screen.getByRole("button", { name: "Create channel" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const payload = create.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("group_id");
    expect(payload).not.toHaveProperty("engine");
  });

  it("prevents duplicate submission while the request is pending", async () => {
    let resolveRequest!: (value: Awaited<ReturnType<typeof api.createChannel>>) => void;
    const pending = new Promise<Awaited<ReturnType<typeof api.createChannel>>>((resolve) => {
      resolveRequest = resolve;
    });
    const create = vi.spyOn(api, "createChannel").mockReturnValue(pending);
    renderModal();
    fireEvent.change(screen.getByLabelText("Channel Name"), { target: { value: "Brain Bites" } });
    const submit = screen.getByRole("button", { name: "Create channel" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(create).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Creating channel…")).toBeTruthy();
    resolveRequest({ channel: { channel_id: "ch_quiz" } as never, task: null });
  });
});
```

- [ ] **Step 2: Run the modal test and confirm the retired selector is observable**

Run: `pnpm --filter @studio/web test -- src/features/channel/components/CreateChannelModal.test.tsx`

Expected: FAIL because the type label is rendered, the request contains `group_id`, or two immediate submissions are accepted.

- [ ] **Step 3: Simplify the modal form and guard submission**

```tsx
type CreateChannelForm = {
  name: string;
  description: string;
  target_audience: string;
  language: string;
  country: string;
  market: string;
  dna_mode: "example" | "ai" | "upload";
  dna_content: string;
};

const submittingRef = useRef(false);

const submit = async (event: React.FormEvent) => {
  event.preventDefault();
  if (submittingRef.current) return;
  submittingRef.current = true;
  setBusy(true);
  try {
    const result = await api.createChannel({ ...form, dna_mode: "ai" });
    await onCreated(result.channel.channel_id, t("channels.channelCreatedNotice"), result.task);
  } catch (error) {
    onError(error);
  } finally {
    submittingRef.current = false;
    setBusy(false);
  }
};
```

Delete the entire visible type-selector field. Remove its translation keys and the now-unused `.channel-type-toggle-grid`, `.channel-type-option`, `.type-title`, and `.type-badge` CSS blocks.

- [ ] **Step 4: Convert application modal state from a type value to a boolean**

```tsx
const [showCreate, setShowCreate] = useState(false);
const requestCreateChannel = useCallback(() => setShowCreate(true), []);
```

Change `onCreate` and `requestCreateChannel` signatures to `() => void`; remove the retired channel-group type alias, `activeGroupQuery`, `onGroupChange`, `activeGroup`, and the `group` query mutation from the channel route. Render `<CreateChannelModal>` without `initialGroupId`.

- [ ] **Step 5: Run focused web verification**

Run: `pnpm --filter @studio/web test -- src/features/channel/components/CreateChannelModal.test.tsx src/components/AppViewRouter.test.tsx`

Expected: PASS.

Run: `pnpm --filter @studio/web typecheck`

Expected: PASS with no retired channel-group type-alias references.

- [ ] **Step 6: Commit the single-flow UI**

```powershell
git add -- apps/web/src/features/channel/components/CreateChannelModal.tsx apps/web/src/features/channel/components/CreateChannelModal.test.tsx apps/web/src/components/channel/ChannelsListView.tsx apps/web/src/components/ChannelList.tsx apps/web/src/components/ChannelView.tsx apps/web/src/components/AppViewRouter.tsx apps/web/src/components/AppViewRouter.test.tsx apps/web/src/components/AppModals.tsx apps/web/src/hooks/useSystemUiState.ts apps/web/src/App.tsx apps/web/src/i18n/locales/en/channels.ts apps/web/src/i18n/locales/vi/channels.ts apps/web/src/styles/features/channels/channelModal.css
git commit -m "refactor: make channel creation quiz only"
```

---

### Task 2: Collapse episode presentation to the Quiz workspace

**Files:**
- Create: `apps/web/src/features/episode/quizOnlyPresentation.test.ts`
- Delete: `apps/web/src/features/episode/components/` + the retired alternate episode component filename constructed in the test below
- Delete: `apps/web/src/features/episode/NarrationTrackPanel.tsx`
- Modify: `apps/web/src/components/EpisodeView.tsx`
- Modify: `apps/web/src/components/chrome/topbar/ChannelSelector.tsx`
- Modify: `apps/web/src/components/chrome/EpisodeAssetPills.tsx`
- Modify: `apps/web/src/components/dashboard/OperationalDomainTable.tsx`
- Modify: `apps/web/src/components/taskProgress/thinkingSteps.ts`
- Modify: `apps/web/src/features/episode/EpisodeHeader.tsx`
- Modify: `apps/web/src/features/episode/QuizVideoPanel.tsx`
- Modify: `apps/web/src/features/episode/components/QuizEpisodeView.tsx`
- Modify: `apps/web/src/features/episode/components/PipelineRail.tsx`
- Modify: `apps/web/src/features/episode/hooks/useEpisodePipeline.ts`
- Modify: `apps/web/src/features/episode/hooks/useEpisodeUIState.ts`
- Modify: `apps/web/src/features/episode/utils/quizRailCalculations.ts`
- Modify: `apps/web/src/features/episode/utils/quizRailCalculations.test.ts`
- Modify: `apps/web/src/features/episode/types.ts`
- Modify: `apps/web/src/features/tasks/types.ts`
- Modify: `apps/web/src/api/episodeApi.ts`

**Interfaces:**
- Consumes: `Channel`, `Episode`, Quiz readiness, Quiz V2 state, and existing task events.
- Produces: one `EpisodeDetail` render path, mode-free `EpisodeHeader` and `QuizVideoPanel` props, and `QUIZ_PREPRODUCTION_TASK_MAP` for research-to-render progress.

- [ ] **Step 1: Write a failing structural presentation test**

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

describe("Quiz-only episode presentation", () => {
  it("has no channel-mode routing or alternate episode component", () => {
    const episodeView = read("../../components/EpisodeView.tsx");
    const channelSelector = read("../../components/chrome/topbar/ChannelSelector.tsx");
    const retiredComponent = ["Docu", "mentaryEpisodeView"].join("");
    const retiredPath = new URL(`./components/${retiredComponent}.tsx`, import.meta.url);

    expect(episodeView).not.toContain("channel.engine");
    expect(episodeView).not.toContain("channel.group_id");
    expect(channelSelector).not.toContain("ch.engine");
    expect(existsSync(retiredPath)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the structural test to verify it fails**

Run: `pnpm --filter @studio/web test -- src/features/episode/quizOnlyPresentation.test.ts`

Expected: FAIL on the mode checks and alternate component path.

- [ ] **Step 3: Render Quiz directly and remove mode flags**

`EpisodeDetail` must render `<QuizEpisodeView>` unconditionally after loading. Remove `isQuiz` from `EpisodeHeader`, `QuizVideoPanel`, `useEpisodeUIState`, and their callers. Replace conditional labels/actions with the Quiz variants:

```tsx
<h2>Quiz Video</h2>

<button
  className="primary-button"
  disabled={Boolean(activeEpisodeTask) || busy === "GENERATE_PIPELINE"}
  onClick={() => void onCreateTask("GENERATE_PIPELINE")}
>
  {activeEpisodeTask || busy === "GENERATE_PIPELINE" ? <CircleNotch className="spin" size={16} /> : <Play size={16} />}
  <span>{readiness.video ? "Rebuild Quiz Video" : "Start production"}</span>
</button>
```

- [ ] **Step 4: Rename the progress map and remove the unreachable narration UI**

```ts
const QUIZ_PREPRODUCTION_TASK_MAP: Partial<Record<RailStage, { types: Task["task_type"][]; readyKey: keyof Readiness }>> = {
  research: { types: ["GENERATE_RESEARCH"], readyKey: "research" },
  treatment: { types: ["GENERATE_TREATMENT"], readyKey: "treatment" },
  script: { types: ["GENERATE_SCRIPT"], readyKey: "script" },
  visualBible: { types: ["GENERATE_VISUAL_BIBLE"], readyKey: "visualBible" },
  render: { types: ["GENERATE_VIDEO"], readyKey: "video" },
};
```

Delete the alternate episode component and `NarrationTrackPanel`. Remove `assembleNarration`, the retired narration task labels, and its progress/dashboard filters from the web layer. Keep `GENERATE_AUDIO`, which remains a reachable per-scene Quiz preview action.

- [ ] **Step 5: Run web tests and typecheck**

Run: `pnpm --filter @studio/web test -- src/features/episode/quizOnlyPresentation.test.ts src/features/episode/utils/quizRailCalculations.test.ts src/components/AppViewRouter.test.tsx`

Expected: PASS.

Run: `pnpm --filter @studio/web typecheck`

Expected: PASS with no `isQuiz` presentation prop and no retired narration UI reference.

- [ ] **Step 6: Commit Quiz-only presentation**

```powershell
git add -A -- apps/web/src/components/EpisodeView.tsx apps/web/src/components/chrome apps/web/src/components/dashboard/OperationalDomainTable.tsx apps/web/src/components/taskProgress/thinkingSteps.ts apps/web/src/features/episode apps/web/src/features/tasks/types.ts apps/web/src/api/episodeApi.ts
git commit -m "refactor: collapse episode UI to quiz workflow"
```

---

### Task 3: Consolidate server context and orchestration around Quiz

**Files:**
- Create: `apps/server/test/quizOnlyPipeline.test.ts`
- Rename: retired runner under `apps/server/src/tasks/pipeline/` to `apps/server/src/tasks/pipeline/quizProductionPipelineRunner.ts`
- Modify: `apps/server/src/tasks/pipelineRunner.ts`
- Modify: `apps/server/src/contextContracts.ts`
- Modify: `apps/server/src/context/channelContextBuilder.ts`
- Modify: `apps/server/src/context/episodeContextBuilder.ts`
- Modify: `apps/server/src/context/pipelineArtifactLoader.ts`
- Modify: `apps/server/src/context/shotArtifactLoader.ts`
- Modify: `apps/server/src/context/taskInstructions.ts`
- Modify: `apps/server/src/tasks/codexRetries.ts`
- Modify: `apps/server/src/tasks/handlers/textArtifactHandlers.ts`
- Modify: `apps/server/src/tasks/handlers/sceneArtifactHandlers.ts`
- Modify: `apps/server/src/tasks/pipeline/pipelineHelpers.ts`
- Modify: `apps/server/src/tasks/video/videoCompositionPreparer.ts`
- Modify: `apps/server/src/repository/scenes.ts`
- Modify: `apps/server/src/routes/quizV2.ts`
- Modify: `apps/server/test/context.test.ts`
- Modify: `apps/server/test/tasks.test.ts`
- Modify: `apps/server/test/quizV2Route.test.ts`

**Interfaces:**
- Consumes: existing Quiz task types, `Channel`, `Episode`, repository artifacts, and `runQuizV2Pipeline`.
- Produces: `runPipelineTask`, `selectResearchForQuestion(researchMarkdown: string, questionNumber: number): string`, and server code with no channel-mode condition.

- [ ] **Step 1: Write the failing Quiz-only server tests**

```ts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { selectResearchForQuestion } from "../src/contextContracts.js";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

describe("Quiz-only server pipeline", () => {
  it("scopes research by question without a production-mode argument", () => {
    const research = "# Research\n\n### C02\nQuestion two evidence";
    expect(selectResearchForQuestion(research, 2)).toContain("Question two evidence");
  });

  it("contains no channel-mode branches and uses the Quiz runner filename", () => {
    const files = [
      "context/channelContextBuilder.ts",
      "context/episodeContextBuilder.ts",
      "tasks/codexRetries.ts",
      "tasks/handlers/textArtifactHandlers.ts",
      "tasks/handlers/sceneArtifactHandlers.ts",
      "tasks/pipeline/pipelineHelpers.ts",
      "tasks/video/videoCompositionPreparer.ts",
      "repository/scenes.ts",
      "routes/quizV2.ts",
    ];
    for (const relative of files) {
      const source = readFileSync(path.join(serverRoot, relative), "utf8");
      expect(source).not.toMatch(/channel\.(engine|group_id)/);
    }
    const retiredRunner = ["docu", "mentaryPipelineRunner.ts"].join("");
    expect(existsSync(path.join(serverRoot, "tasks/pipeline/quizProductionPipelineRunner.ts"))).toBe(true);
    expect(existsSync(path.join(serverRoot, "tasks/pipeline", retiredRunner))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the new server test and verify it fails**

Run: `pnpm --filter @studio/server test -- test/quizOnlyPipeline.test.ts`

Expected: FAIL because `selectResearchForQuestion` and the Quiz runner file do not exist and mode branches remain.

- [ ] **Step 3: Rename the full runner and preserve only the reachable Quiz sequence**

Use `apply_patch` to move the runner to `quizProductionPipelineRunner.ts`, keep the research → treatment → script → visual bible → question scenes → Quiz V2 → render sequence, and update the barrel export:

```ts
export { runPipelineTask } from "./pipeline/quizProductionPipelineRunner.js";
export { runQuizV2Pipeline } from "./pipeline/quizV2PipelineRunner.js";
```

- [ ] **Step 4: Replace context-mode branches with Quiz policy**

Rename the research selector and remove its unused boolean:

```ts
export function selectResearchForQuestion(researchMarkdown: string, questionNumber: number): string {
  const claimId = `C${String(questionNumber).padStart(2, "0")}`;
  const shortClaimId = `C${questionNumber}`;
  // Keep the existing ledger and claim-section extraction, substituting questionNumber for sequenceNumber.
}
```

Use `ArtifactSectionKind` value `"question"` unconditionally in episode context and shot loading. Load `prompt_rules.md` for question-scene work. Return Quiz output contracts directly, and remove `isQuiz` from `ArtifactContext`, `TaskInstructionInput`, and all callers.

- [ ] **Step 5: Make repository, retry, validation, route, and render guards Quiz-only**

Apply these policy replacements:

```ts
assertQuizSceneChoicePolicy(normalized, episode, true);
await this.invalidateQuizArtifacts(channelId, episodeId, quizInvalidationStages("research"));
validateQuizResearch(research, episode.quiz_config.question_count);
validateQuizTreatment(treatment, episode.quiz_config.question_count);
validateQuizScript(script, episode.quiz_config.question_count);
validateQuizVisualBible(visualBible, requiredSections);
```

The Quiz V2 routes no longer fetch a channel to reject another mode. New video renders require complete Quiz V2 artifacts unconditionally when no previous video asset exists. Retry prompts always use Quiz contracts and messages.

- [ ] **Step 6: Run focused server verification**

Run: `pnpm --filter @studio/server test -- test/quizOnlyPipeline.test.ts test/context.test.ts test/tasks.test.ts test/quizV2Route.test.ts`

Expected: PASS.

Run: `pnpm --filter @studio/server typecheck`

Expected: PASS.

- [ ] **Step 7: Commit the Quiz-only server policy**

```powershell
git add -A -- apps/server/src/context apps/server/src/contextContracts.ts apps/server/src/tasks apps/server/src/repository/scenes.ts apps/server/src/routes/quizV2.ts apps/server/test/quizOnlyPipeline.test.ts apps/server/test/context.test.ts apps/server/test/tasks.test.ts apps/server/test/quizV2Route.test.ts
git commit -m "refactor: consolidate production around quiz"
```

---

### Task 4: Remove the unreachable narration task lifecycle

**Files:**
- Modify: `packages/shared/src/enums/core.ts`
- Modify: `apps/server/src/routes/audioVideo.ts`
- Modify: `apps/server/src/tasks/audioRunner.ts`
- Modify: `apps/server/src/tasks/taskQueuePump.ts`
- Modify: `apps/server/src/tasks/checkpoints.ts`
- Modify: `apps/server/src/tasks/fingerprints.ts`
- Modify: `apps/server/test/quizV2Route.test.ts`
- Modify: `apps/server/test/tasks.test.ts`
- Modify: `apps/web/test/smoke.spec.ts`

**Interfaces:**
- Consumes: `GENERATE_AUDIO` for reachable per-scene preview generation.
- Produces: a `TaskType` union without the unreachable master-narration task, no assembly endpoint, and an audio runner dedicated to scene audio.

- [ ] **Step 1: Add failing contract and route assertions**

```ts
const retiredNarrationTask = ["GENERATE_", "NARRATION"].join("");
expect(TaskTypeSchema.safeParse(retiredNarrationTask).success).toBe(false);

const response = await app.server.inject({
  method: "POST",
  url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/narration/assemble`,
});
expect(response.statusCode).toBe(404);
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `pnpm --filter @studio/server test -- test/quizV2Route.test.ts test/tasks.test.ts`

Expected: FAIL because the task type and route still exist.

- [ ] **Step 3: Remove the unreachable task, route, and helper state**

Remove the task enum member, its queue membership, `runNarrationTask`, the narration assembly route, narration checkpoint functions/types, and `narrationSegmentFingerprint`. Keep scene `GENERATE_AUDIO`, rendered Quiz narration asset fields, and soundtrack/render checkpoint functions.

The remaining runner entry is direct:

```ts
export async function runAudioTask(this: TaskManagerRuntime, task: Task): Promise<void> {
  if (!task.episode_id) throw new RepositoryError("Episode is required", "EPISODE_REQUIRED");
  const sceneNumber = this.findSceneNumber(task.task_id);
  // Preserve the existing scene lookup, voice selection, synthesis, persistence, and completion logic.
}
```

- [ ] **Step 4: Update tests and smoke fixtures**

Delete tests that submit the retired task and update task lists to use `GENERATE_AUDIO` or Quiz V2 voice tasks. Keep the route 404 assertion as the regression contract.

- [ ] **Step 5: Run shared/server/web checks**

Run: `pnpm --filter @studio/shared build`

Run: `pnpm --filter @studio/server test -- test/quizV2Route.test.ts test/tasks.test.ts`

Run: `pnpm --filter @studio/web typecheck`

Expected: all PASS.

- [ ] **Step 6: Commit narration lifecycle removal**

```powershell
git add -- packages/shared/src/enums/core.ts apps/server/src/routes/audioVideo.ts apps/server/src/tasks/audioRunner.ts apps/server/src/tasks/taskQueuePump.ts apps/server/src/tasks/checkpoints.ts apps/server/src/tasks/fingerprints.ts apps/server/test/quizV2Route.test.ts apps/server/test/tasks.test.ts apps/web/test/smoke.spec.ts
git commit -m "refactor: remove unreachable narration workflow"
```

---

### Task 5: Remove channel production discriminators from contracts and data creation

**Files:**
- Create: `apps/server/test/channelContract.test.ts`
- Modify: `packages/shared/src/api/channel.ts`
- Modify: `packages/shared/src/schemas/channel.ts`
- Modify: `apps/server/src/repository/channels.ts`
- Modify: `apps/server/test/repository.test.ts`
- Modify fixtures in: `apps/server/test/configPropagation.test.ts`, `apps/server/test/context.test.ts`, `apps/server/test/imagePipeline.test.ts`, `apps/server/test/mascotStagePreset.test.ts`, `apps/server/test/mascotStudio.test.ts`, `apps/server/test/quizAssetsQa.test.ts`, `apps/server/test/quizBgm.test.ts`, `apps/server/test/quizParallelAssetsVoice.test.ts`, `apps/server/test/quizRepository.test.ts`, `apps/server/test/quizStylePersistence.test.ts`, `apps/server/test/quizV2Route.test.ts`, `apps/server/test/tasks.test.ts`, `apps/web/src/components/AppViewRouter.test.tsx`, `apps/web/src/features/episode/hooks/useEpisodeChannelBrandName.test.tsx`, `apps/web/src/features/episode/hooks/useEpisodeStylePreview.test.tsx`, `apps/web/test/phase08cAppFixture.ts`, `apps/web/test/quizV2.spec.ts`, `apps/web/test/smoke.spec.ts`

**Interfaces:**
- Consumes: identity, locale, audience, visual defaults, mascot configuration, and Quiz episode contracts.
- Produces: strict `CreateChannelInputSchema` and `ChannelSchema` contracts without channel-level production/grouping discriminators.

- [ ] **Step 1: Write failing boundary tests**

```ts
import { describe, expect, it } from "vitest";
import { ChannelSchema, CreateChannelInputSchema } from "@studio/shared";

const createInput = {
  name: "Brain Bites",
  description: "Fast family quizzes",
  target_audience: "Families",
  language: "English",
  country: "AU",
  market: "AU",
  dna_mode: "ai" as const,
};

describe("Quiz-only channel contracts", () => {
  it("rejects stale discriminator fields at create boundary", () => {
    expect(CreateChannelInputSchema.safeParse({ ...createInput, group_id: "quiz" }).success).toBe(false);
    expect(CreateChannelInputSchema.safeParse({ ...createInput, engine: "quiz" }).success).toBe(false);
  });

  it("rejects discriminator fields in persisted channel metadata", () => {
    const channel = {
      channel_id: "ch_1",
      slug: "brain-bites",
      display_name: "Brain Bites",
      channel_dna_path: "channels/brain-bites/channel_dna.md",
      status: "DRAFT",
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
      group_id: "quiz",
      engine: "quiz",
    };
    expect(ChannelSchema.safeParse(channel).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `pnpm --filter @studio/server test -- test/channelContract.test.ts`

Expected: FAIL because both schemas currently accept the fields.

- [ ] **Step 3: Make channel schemas strict and discriminator-free**

```ts
export const CreateChannelInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).default(""),
    target_audience: z.string().trim().max(240).default(""),
    language: z.string().trim().max(80).default("English"),
    country: z.string().trim().max(80).default("GLOBAL"),
    market: z.string().trim().max(120).default(""),
    dna_mode: z.enum(["example", "ai", "upload"]).default("example"),
    dna_content: z.string().optional(),
  })
  .strict();
```

Remove the two fields from `ChannelSchema`, call `.strict()`, and remove them from the repository-created JSON object.

- [ ] **Step 4: Assert repository output and update fixtures**

Add to the repository creation test:

```ts
const persisted = JSON.parse(
  await readFile(path.join(repository.storageRoot, "channels", first.slug, "channel.json"), "utf8"),
) as Record<string, unknown>;
expect(persisted).not.toHaveProperty("group_id");
expect(persisted).not.toHaveProperty("engine");
```

Use `apply_patch` to remove only channel-level `group_id: "quiz"` and `engine: "quiz"` fixture properties from the listed files. Do not touch Quiz asset `group_id` fields or render-manifest provider `engine` fields.

- [ ] **Step 5: Run contracts, repository tests, and workspace typecheck**

Run: `pnpm --filter @studio/shared build`

Run: `pnpm --filter @studio/server test -- test/channelContract.test.ts test/repository.test.ts`

Run: `pnpm -r typecheck`

Expected: all PASS with no channel consumer reading either removed property.

- [ ] **Step 6: Commit the discriminator-free contract**

```powershell
git add -- packages/shared/src/api/channel.ts packages/shared/src/schemas/channel.ts apps/server/src/repository/channels.ts apps/server/test/channelContract.test.ts apps/server/test/repository.test.ts apps/server/test/configPropagation.test.ts apps/server/test/context.test.ts apps/server/test/imagePipeline.test.ts apps/server/test/mascotStagePreset.test.ts apps/server/test/mascotStudio.test.ts apps/server/test/quizAssetsQa.test.ts apps/server/test/quizBgm.test.ts apps/server/test/quizParallelAssetsVoice.test.ts apps/server/test/quizRepository.test.ts apps/server/test/quizStylePersistence.test.ts apps/server/test/quizV2Route.test.ts apps/server/test/tasks.test.ts apps/web/src/components/AppViewRouter.test.tsx apps/web/src/features/episode/hooks/useEpisodeChannelBrandName.test.tsx apps/web/src/features/episode/hooks/useEpisodeStylePreview.test.tsx apps/web/test/phase08cAppFixture.ts apps/web/test/quizV2.spec.ts apps/web/test/smoke.spec.ts
git commit -m "refactor: remove channel production discriminators"
```

---

### Task 6: Rename the runtime namespace and enforce current-tree cleanliness

**Files:**
- Create: `apps/server/src/runtimePaths.ts`
- Create: `apps/server/test/runtimeNamespace.test.ts`
- Create: `scripts/audit-quiz-only.mjs`
- Modify: `.gitignore`
- Modify: `.prettierignore`
- Modify: `eslint.config.mjs`
- Modify: `package.json`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/server/src/codex/commandResolver.ts`
- Modify: `apps/server/src/config/configReader.ts`
- Modify: `apps/server/src/config/configWriter.ts`
- Modify: `apps/server/src/context/contextManifestFinalizer.ts`
- Modify: `apps/server/src/context/shotArtifactLoader.ts`
- Modify: `apps/server/src/logger.ts`
- Modify: `apps/server/src/repository/pathSafety.ts`
- Modify: `apps/server/src/repository/voices.ts`
- Modify: `apps/server/src/tasks/handlers/sceneArtifactHandlers.ts`
- Modify tests containing the retired runtime prefix under `apps/server/test/`
- Modify: `run dashboard.bat`
- Modify: `scripts/analyze_structure.mjs`
- Modify: `scripts/benchmark-render.mjs`
- Modify: `scripts/ensure-tts.ps1`
- Modify: `scripts/stop-dashboard.ps1`
- Modify: `services/tts/app.py`
- Modify: `services/tts/patches.py`
- Modify: `shared/visual_rules.md`
- Modify: `shared/treatment_rules.md`
- Modify: `shared/script_rules.md`
- Modify: `shared/cinematic_prompt_reference.md`
- Modify: `docs/architecture.md`
- Modify: `docs/codex-integration.md`
- Modify: `docs/github-publishing.md`
- Modify: `docs/setup.md`
- Modify: `docs/troubleshooting.md`

**Interfaces:**
- Consumes: project root, configured storage root, and existing config filenames.
- Produces: `STUDIO_RUNTIME_DIRECTORY = ".quiz-studio"`, `studioRuntimePath(rootDirectory, ...segments)`, and `pnpm audit:quiz-only`.

- [ ] **Step 1: Add a failing runtime-path test**

```ts
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { saveCodexSettings } from "../src/config.js";
import { STUDIO_RUNTIME_DIRECTORY, studioRuntimePath } from "../src/runtimePaths.js";

const roots: string[] = [];

afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("runtime namespace", () => {
  it("writes settings only beneath .quiz-studio", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-runtime-"));
    roots.push(root);
    await saveCodexSettings(root, { model: "gpt-5.5" });
    expect(STUDIO_RUNTIME_DIRECTORY).toBe(".quiz-studio");
    await expect(access(studioRuntimePath(root, "codex.local.json"))).resolves.toBeUndefined();
    const retiredDirectory = [".docu", "mentary-studio"].join("");
    await expect(access(path.join(root, retiredDirectory, "codex.local.json"))).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Add the source audit and run both guards red**

```js
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const retiredProductToken = ["docu", "mentary"].join("");
const forbidden = [
  retiredProductToken,
  ["channel", "groupid"].join(""),
  ["channeltype", "historytitle"].join(""),
  ["channeltype", "historybadge"].join(""),
  ["generate_", "narration"].join(""),
].map((value) => value.toLowerCase());

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const failures = [];
for (const file of files) {
  const lowerPath = file.toLowerCase();
  for (const token of forbidden) if (lowerPath.includes(token)) failures.push(`${file}: filename contains ${token}`);
  const buffer = readFileSync(file);
  if (buffer.includes(0)) continue;
  const content = buffer.toString("utf8").toLowerCase();
  for (const token of forbidden) if (content.includes(token)) failures.push(`${file}: content contains ${token}`);
}
if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("Quiz-only source audit passed\n");
```

Add scripts:

```json
"audit:quiz-only": "node scripts/audit-quiz-only.mjs",
"test": "pnpm --filter @studio/shared build && pnpm --filter @studio/server test && pnpm --filter @studio/web test && node scripts/audit-quiz-choice-count.mjs && node scripts/audit-quiz-only.mjs"
```

Run: `pnpm --filter @studio/server test -- test/runtimeNamespace.test.ts`

Run: `pnpm audit:quiz-only`

Expected: both FAIL because runtime paths and current-tree references remain.

- [ ] **Step 3: Centralize TypeScript runtime paths**

```ts
import path from "node:path";

export const STUDIO_RUNTIME_DIRECTORY = ".quiz-studio";

export function studioRuntimePath(rootDirectory: string, ...segments: string[]): string {
  return path.join(rootDirectory, STUDIO_RUNTIME_DIRECTORY, ...segments);
}
```

Replace server path literals with this helper where they target the project settings directory. Repository runtime roots use `STUDIO_RUNTIME_DIRECTORY` under the configured storage root. Serialized asset paths use `.quiz-studio/...`.

- [ ] **Step 4: Update scripts, package metadata, services, rules, tests, and docs**

Use Quiz Studio wording and `.quiz-studio` paths. Rename temporary test prefixes to `quiz-studio-*` or a test-specific `quiz-*` prefix. Rewrite shared rule sentences so they describe evidence-backed Quiz questions and visual clarity. Preserve legitimate provider `engine` fields and user-authored content terminology.

Update ignore patterns only in the implementation worktree; the original checkout runtime is migrated in Task 7 before the updated branch is run there.

- [ ] **Step 5: Run the runtime tests and full source audit green**

Run: `pnpm --filter @studio/server test -- test/runtimeNamespace.test.ts test/engineSettings.test.ts test/securityAndResilience.test.ts test/codex.test.ts`

Run: `pnpm audit:quiz-only`

Expected: PASS and zero forbidden tracked filename/content findings.

- [ ] **Step 6: Commit namespace and recurrence guard**

```powershell
git add -A -- .gitignore .prettierignore eslint.config.mjs package.json apps/server/src apps/server/test scripts services shared docs 'run dashboard.bat'
git commit -m "refactor: rename runtime for quiz studio"
```

---

### Task 7: Migrate local channel metadata and both runtime directories

**Files:**
- Runtime source and destination under `D:\1a Cursor Project\My 1x Project`
- Runtime source and destination under `D:\1a Cursor Project\My 1x Youtube Channel File`
- Channel metadata under `D:\1a Cursor Project\My 1x Youtube Channel File\channels\*\channel.json`

**Interfaces:**
- Consumes: the updated `.quiz-studio` runtime contract and six verified Quiz channel files.
- Produces: two moved runtime directories, six discriminator-free channel files, and a recovery copy at `.quiz-studio/migration-backups/<timestamp>/channels`.

- [ ] **Step 1: Stop affected services and print a structured preflight**

Run the updated `scripts/stop-dashboard.ps1`, then execute:

```powershell
function Write-MigrationLog {
  param([string]$Level, [string]$Step, [string]$Message, [ConsoleColor]$Color)
  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "$timestamp [$Level] [STEP:$Step] $Message" -ForegroundColor $Color
}

$projectRoot = [IO.Path]::GetFullPath('D:\1a Cursor Project\My 1x Project')
$contentRoot = [IO.Path]::GetFullPath('D:\1a Cursor Project\My 1x Youtube Channel File')
$retiredRuntimeName = '.docu' + 'mentary-studio'
$quizRuntimeName = '.quiz-studio'
$projectSource = [IO.Path]::GetFullPath((Join-Path $projectRoot $retiredRuntimeName))
$projectTarget = [IO.Path]::GetFullPath((Join-Path $projectRoot $quizRuntimeName))
$contentSource = [IO.Path]::GetFullPath((Join-Path $contentRoot $retiredRuntimeName))
$contentTarget = [IO.Path]::GetFullPath((Join-Path $contentRoot $quizRuntimeName))

Write-MigrationLog INFO preflight "Project runtime: $projectSource -> $projectTarget" Cyan
Write-MigrationLog INFO preflight "Content runtime: $contentSource -> $contentTarget" Cyan
```

- [ ] **Step 2: Validate exact move targets before touching data**

```powershell
$pairs = @(
  @{ Root = $projectRoot; Source = $projectSource; Target = $projectTarget },
  @{ Root = $contentRoot; Source = $contentSource; Target = $contentTarget }
)
foreach ($pair in $pairs) {
  $rootPrefix = $pair.Root.TrimEnd('\') + '\'
  if (-not $pair.Source.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Source escaped expected root" }
  if (-not $pair.Target.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Target escaped expected root" }
  if (-not (Test-Path -LiteralPath $pair.Source -PathType Container)) { throw "Missing source: $($pair.Source)" }
  if (Test-Path -LiteralPath $pair.Target) { throw "Target already exists: $($pair.Target)" }
}
Write-MigrationLog OK preflight 'Exact source and destination paths verified' Green
```

- [ ] **Step 3: Back up and atomically rewrite the six channel files**

```powershell
$migrationStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$temporaryBackup = [IO.Path]::GetFullPath((Join-Path $contentRoot ".quiz-migration-$migrationStamp"))
$channelsRoot = [IO.Path]::GetFullPath((Join-Path $contentRoot 'channels'))
New-Item -ItemType Directory -Path $temporaryBackup | Out-Null
$channelFiles = @(Get-ChildItem -LiteralPath $channelsRoot -Filter 'channel.json' -File -Recurse)
if ($channelFiles.Count -ne 6) { throw "Expected 6 channel files, found $($channelFiles.Count)" }

foreach ($file in $channelFiles) {
  $channelDirectory = Split-Path -Leaf (Split-Path -Parent $file.FullName)
  $backupDirectory = Join-Path $temporaryBackup $channelDirectory
  New-Item -ItemType Directory -Path $backupDirectory | Out-Null
  Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $backupDirectory 'channel.json')

  $metadata = Get-Content -Raw -LiteralPath $file.FullName | ConvertFrom-Json
  $metadata.PSObject.Properties.Remove('group_id')
  $metadata.PSObject.Properties.Remove('engine')
  $temporaryFile = "$($file.FullName).quiz-migration.tmp"
  [IO.File]::WriteAllText($temporaryFile, (($metadata | ConvertTo-Json -Depth 100) + [Environment]::NewLine))
  Move-Item -LiteralPath $temporaryFile -Destination $file.FullName -Force
  Write-MigrationLog OK channel_metadata "Migrated $channelDirectory" Green
}
```

- [ ] **Step 4: Move runtime directories without merging**

```powershell
Move-Item -LiteralPath $projectSource -Destination $projectTarget
Write-MigrationLog OK runtime_move 'Project runtime moved' Green
Move-Item -LiteralPath $contentSource -Destination $contentTarget
Write-MigrationLog OK runtime_move 'Content runtime moved' Green

$recoveryTarget = Join-Path $contentTarget "migration-backups\$migrationStamp\channels"
New-Item -ItemType Directory -Path (Split-Path -Parent $recoveryTarget) -Force | Out-Null
Move-Item -LiteralPath $temporaryBackup -Destination $recoveryTarget
Write-MigrationLog OK backup 'Recovery copy stored under the new runtime' Green
```

- [ ] **Step 5: Verify migrated state before startup**

```powershell
if (Test-Path -LiteralPath $projectSource) { throw 'Retired project runtime still exists' }
if (Test-Path -LiteralPath $contentSource) { throw 'Retired content runtime still exists' }
if (-not (Test-Path -LiteralPath $projectTarget)) { throw 'New project runtime missing' }
if (-not (Test-Path -LiteralPath $contentTarget)) { throw 'New content runtime missing' }
$staleChannelFields = rg -n '"(group_id|engine)"\s*:' $channelsRoot -g 'channel.json'
if ($LASTEXITCODE -eq 0) { throw "Channel migration incomplete: $staleChannelFields" }
Write-MigrationLog OK verify 'Runtime and channel metadata migration verified' Green
```

Expected: both new runtime directories exist, both old runtime directories are absent, and the channel-only scan returns no discriminator fields. Asset-plan `group_id` and render-manifest provider `engine` fields are outside this scan and remain untouched.

---

### Task 8: Run the updated artifact and verify primary workflows

**Files:**
- No new source files unless a verification failure exposes a missing test or bug.

**Interfaces:**
- Consumes: all prior commits, migrated runtime state, six channels, and existing Playwright fixtures.
- Produces: fresh formatter/lint/type/test/build evidence plus a restarted, visually verified Quiz application.

- [ ] **Step 1: Review the complete diff for architecture and user-change safety**

Run: `git status --short`

Expected: only the user's three pre-existing schema changes remain uncommitted; implementation files are committed.

Run: `git diff HEAD~6..HEAD --stat`

Run: `git diff HEAD~6..HEAD --check`

Expected: no whitespace errors, accidental generated output, or unrelated schema edits.

- [ ] **Step 2: Run static and automated verification**

Run: `pnpm format:check`

Run: `pnpm lint`

Run: `pnpm typecheck`

Run: `pnpm test`

Run: `pnpm build`

Expected: every command exits 0, including `audit:quiz-only`.

- [ ] **Step 3: Restart the updated application without taking desktop input focus**

Run `pnpm dev` in a PTY-backed terminal session. Wait for the server and Vite readiness messages, then verify `http://127.0.0.1:4312/api/channels` and `http://127.0.0.1:2244/` respond successfully. Do not launch a visible helper window.

- [ ] **Step 4: Verify channel creation behavior under success and failure**

Use Playwright against the restarted app to confirm:

```ts
await expect(page.getByRole("heading", { name: "Create new channel" })).toBeVisible();
await expect(page.getByText("Channel Track / Type")).toHaveCount(0);
await expect(page.getByRole("button", { name: "Create channel" })).toBeDisabled();
```

Create a temporary test channel through an intercepted successful API response and verify the button pending state, one POST, server-confirmed refresh, modal close, channel open, and success notice. Intercept a 500 response on a second run and verify inputs remain populated and retry sends exactly one new POST.

- [ ] **Step 5: Verify desktop/mobile copy, accessibility, synchronization, and footer**

At 1440×900 and 390×844 viewports, confirm no selector gap, no title ends with a period, controls have accessible names, keyboard focus reaches every action, and exactly one required footer version is visible. Confirm channel/episode views update after task events without a full-page refresh and reconnect does not regress state.

- [ ] **Step 6: Verify real persisted data and start one Quiz workflow**

Read `/api/channels` and confirm six existing channels load from `.quiz-studio`. Open at least one existing episode, confirm its Quiz workspace renders, and start a bounded non-destructive Quiz operation such as topic suggestion or a test-environment pipeline run. Confirm pending, progress, success/error recovery, and affected-view refresh behavior.

- [ ] **Step 7: Stop verification processes and record final evidence**

Stop the PTY dev session cleanly. Capture the exact commands and exit codes in the delivery message, including any check that could not be completed. Do not claim completion until `superpowers:verification-before-completion` has been applied to fresh output.
