import { EventEmitter } from "node:events";
import { rm } from "node:fs/promises";
import { afterEach } from "vitest";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => undefined)),
  );
});

/** Registers a temporary repository root for automatic cleanup after each test in the importing test file. */
export function registerTestRoot(root: string): void {
  roots.push(root);
}

export async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (!predicate() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 15));
  if (!predicate()) throw new Error("Timed out waiting for task state");
}

export class FakeCodex extends EventEmitter {
  private turnNumber = 0;
  activeTurns = 0;
  maxActiveTurns = 0;
  prompts: string[] = [];
  async connect(): Promise<void> {
    this.emit("status", "connected");
  }
  async startThread(): Promise<string> {
    return `thread_${this.turnNumber + 1}`;
  }
  async resumeThread(threadId: string): Promise<string> {
    return threadId;
  }
  async startTurn(threadId: string, prompt = ""): Promise<string> {
    const turnId = `turn_${++this.turnNumber}`;
    this.prompts.push(prompt);
    this.activeTurns += 1;
    this.maxActiveTurns = Math.max(this.maxActiveTurns, this.activeTurns);
    setTimeout(() => {
      const visualBible = prompt.includes("Task type: GENERATE_VISUAL_BIBLE");
      const strictVisualRetry = visualBible && prompt.includes("STRICT RETRY");
      const sequenceTask = prompt.includes("Task type: GENERATE_SEQUENCE_SCENES");
      const strictSequenceRetry = sequenceTask && prompt.includes("STRICT RETRY");
      const quizResearchCount = Number(prompt.match(/The episode has exactly (\d+) questions/)?.[1] ?? 0);
      const quizResearch = quizResearchCount > 0;
      const strictQuizResearchRetry = quizResearch && prompt.includes("STRICT RETRY");
      const quizVisualBibleCount = Number(prompt.match(/Create exactly (\d+) continuity bundles/)?.[1] ?? 0);
      const quizVisualBible = visualBible && quizVisualBibleCount > 0;
      const safeMotionSection =
        "\n## Safe motion\n\n- Allowed motion: gentle fades, slow scale changes, and calm card slides.\n- Prohibited motion: strobing, flashing, seizure-triggering patterns, and unsafe rapid camera movement.\n- Reduced-motion fallback: hold still frames and use opacity changes only.\n";
      const validVisualBible =
        "# Episode Visual Bible\n\n- Palette: Warm candy colors\n- Countdown: A clear, calm countdown\n- Answer reveal: One focused reveal state\n" +
        safeMotionSection +
        Array.from(
          { length: Math.max(5, quizVisualBibleCount) },
          (_, index) =>
            `## Continuity bundle CB-${String(index + 1).padStart(2, "0")} — Bundle ${index + 1}\n\n- Era: 1950s\n- Location: Test location\n- Subjects: Test subject\n- Palette: Warm neutral\n- Lighting: Soft side light\n- Anchor-frame prompt: A coherent visual environment for bundle ${index + 1}.\n- Reference asset slots: anchor`,
        ).join("\n\n");
      const invalidSequenceBeats = Array.from({ length: 5 }, (_, index) => ({
        dialogue: index === 0 ? "Opening narration." : `Additional beat ${index + 1}.`,
        sequence_id: "sequence-1",
        sequence_title: "Opening",
        shot_id: `shot-${index + 1}`,
        visual_prompt: `Unstructured shot ${index + 1}`,
        asset_type: "ai_reconstruction",
        continuity_key: "opening",
        continuity_bundle_id: "",
        reference_asset_ids: [],
        source_ids: ["C01"],
        reconstruction: true,
        sound_cue: "",
        transition_note: "",
        continuity_note: "",
        editorial_overlay: { kind: "none" },
      }));
      const validSequenceBeat = [
        {
          dialogue: "Opening narration.",
          sequence_id: "sequence-1",
          sequence_title: "Opening",
          shot_id: "shot-1",
          visual_prompt:
            "CAMERA\nWide 35mm locked shot.\nACTION\nThe subject enters and pauses.\nLIGHTING\nSoft 5600K window light.\nATMOSPHERE\nCalm air with 10% haze.\nCONTINUITY\nCB-01 palette and subject identity remain fixed.",
          asset_type: "ai_reconstruction",
          continuity_key: "opening",
          continuity_bundle_id: "CB-01",
          reference_asset_ids: [],
          source_ids: ["C01"],
          reconstruction: true,
          sound_cue: "",
          transition_note: "",
          continuity_note: "Keep CB-01 palette, location, and subject identity.",
          editorial_overlay: { kind: "none" },
          quiz: {
            phase: "question" as const,
            question_number: 1,
            question: "What animal is this?",
            choices: ["Tiger", "Lion", "Leopard"],
            answer: "Tiger",
            explanation: "Tigers have distinct orange and black stripes.",
            image_prompt: "A friendly cartoon tiger in a bright tropical forest.",
          },
        },
      ];
      const delta = prompt.includes("Generate exactly one reference image")
        ? "data:image/png;base64,iVBORw0KGgo="
        : sequenceTask
          ? JSON.stringify(strictSequenceRetry ? validSequenceBeat : invalidSequenceBeats)
          : visualBible
            ? strictVisualRetry
              ? validVisualBible
              : quizVisualBible
                ? validVisualBible.replace(safeMotionSection, "")
                : "# Episode Visual Bible\n\nThe visual bible needs revision."
            : quizResearch
              ? `# Research Dossier\n\n${Array.from({ length: strictQuizResearchRetry ? quizResearchCount : Math.max(1, quizResearchCount - 7) }, (_, index) => `C${String(index + 1).padStart(2, "0")} https://example.com/quiz-${index + 1}`).join("\n")}`
              : "# Research Dossier\n\nC01 https://example.com/1\nC02 https://example.com/2\nC03 https://example.com/3\nC04 https://example.com/4\nC05 https://example.com/5";
      this.emit("notification", { method: "item/agentMessage/delta", params: { threadId, turnId, delta } });
      this.activeTurns -= 1;
      this.emit("notification", { method: "turn/completed", params: { turn: { id: turnId, status: "completed" } } });
    }, 30);
    return turnId;
  }
  async interruptTurn(): Promise<void> {
    /* deterministic fake */
  }
  respond(): void {
    /* deterministic fake */
  }
}

export function fakeWav(seconds = 2): Uint8Array {
  const sampleRate = 8_000;
  const dataSize = sampleRate * seconds * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) =>
    [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  return new Uint8Array(buffer);
}
