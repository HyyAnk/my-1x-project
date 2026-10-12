import { createHash, randomInt } from "node:crypto";
import {
  nowIso,
  quizShortProductRef,
  resolveBuiltInPresetCategoryId,
  type QuizShort,
  type QuizShortBookendPair,
  type QuizShortBookendSnapshot,
} from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import { RepositoryError } from "../repository/errors.js";
import { hashFileSha256, probePortraitBookend } from "./quizShortBookendMedia.js";
import type { QuizShortBookendService } from "./quizShortBookendService.js";
import type { QuizShortBookendStore } from "./quizShortBookendStore.js";

export type QuizShortBookendSelectionDeps = {
  repository: Pick<RepositoryService, "queueEpisodeArtifactMutation">;
  store: QuizShortBookendStore;
  service: QuizShortBookendService;
};

export type ReadyQuizShortBookends = {
  snapshot: QuizShortBookendSnapshot;
  pair: QuizShortBookendPair;
  introSourcePath: string;
  outroSourcePath: string;
};

type PairWithPaths = Omit<ReadyQuizShortBookends, "snapshot">;

export function quizShortBookendSelectionKey(quizShort: Pick<QuizShort, "quiz_config">): string {
  return JSON.stringify([quizShort.quiz_config.bookend_selection, resolveBuiltInPresetCategoryId(quizShort.quiz_config)]);
}

async function withPaths(deps: QuizShortBookendSelectionDeps, pair: QuizShortBookendPair): Promise<PairWithPaths | null> {
  if (!(await deps.service.isReady(pair))) return null;
  const [introSourcePath, outroSourcePath] = await Promise.all([
    deps.store.clipPath(pair.channel_id, pair.pair_id, "intro"),
    deps.store.clipPath(pair.channel_id, pair.pair_id, "outro"),
  ]);
  return { pair, introSourcePath, outroSourcePath };
}

async function choosePair(deps: QuizShortBookendSelectionDeps, quizShort: QuizShort): Promise<PairWithPaths | null> {
  const selection = quizShort.quiz_config.bookend_selection;
  if (selection.mode === "none") return null;
  if (selection.mode === "specific_pair") {
    const pair = await deps.store.getPair(quizShort.channel_id, selection.pair_id);
    const ready = pair ? await withPaths(deps, pair) : null;
    if (!ready) throw new RepositoryError("Selected Short Intro/Outro pair is unavailable", "QUIZ_SHORT_BOOKEND_UNAVAILABLE");
    return ready;
  }
  const category = resolveBuiltInPresetCategoryId(quizShort.quiz_config);
  const pairs = (await deps.store.listPairs(quizShort.channel_id)).filter((pair) => pair.style_preset_id === category);
  const candidates = (await Promise.all(pairs.map((pair) => withPaths(deps, pair)))).filter((pair): pair is PairWithPaths => pair !== null);
  return candidates.length ? candidates[randomInt(candidates.length)] : null;
}

/** Hash of both media files and their probed metadata; editable pair settings are excluded. */
export async function quizShortBookendFingerprint(pair: PairWithPaths): Promise<string> {
  const hashes = await Promise.all([hashFileSha256(pair.introSourcePath), hashFileSha256(pair.outroSourcePath)]);
  return createHash("sha256")
    .update(JSON.stringify({ hashes, intro: pair.pair.intro, outro: pair.pair.outro }))
    .digest("hex");
}

async function createSnapshot(deps: QuizShortBookendSelectionDeps, quizShort: QuizShort): Promise<QuizShortBookendSnapshot> {
  const chosen = await choosePair(deps, quizShort);
  const media = chosen
    ? await Promise.all([probePortraitBookend(chosen.introSourcePath), probePortraitBookend(chosen.outroSourcePath)])
    : null;
  return {
    version: 1,
    selection_key: quizShortBookendSelectionKey(quizShort),
    style_preset_id: resolveBuiltInPresetCategoryId(quizShort.quiz_config),
    pair_id: chosen?.pair.pair_id ?? null,
    fingerprint: chosen ? await quizShortBookendFingerprint(chosen) : null,
    intro_duration_seconds: media?.[0].duration_seconds ?? 0,
    outro_duration_seconds: media?.[1].duration_seconds ?? 0,
    outro_has_audio: media?.[1].has_audio ?? false,
    selected_at: nowIso(),
  };
}

/** Draws a pair once per selection key and persists it, so voice, timeline and render agree. */
export async function pinQuizShortBookends(deps: QuizShortBookendSelectionDeps, quizShort: QuizShort): Promise<QuizShortBookendSnapshot> {
  const ref = quizShortProductRef(quizShort.channel_id, quizShort.quiz_short_id);
  return deps.repository.queueEpisodeArtifactMutation(quizShort.channel_id, ref, async () => {
    const saved = await deps.store.readSnapshot(quizShort.channel_id, quizShort.quiz_short_id);
    if (saved?.selection_key === quizShortBookendSelectionKey(quizShort)) return saved;
    const snapshot = await createSnapshot(deps, quizShort);
    await deps.store.writeSnapshot(quizShort.channel_id, quizShort.quiz_short_id, snapshot);
    return snapshot;
  });
}

/** The pinned pair with verified media, or null when the Short renders without bookends. */
export async function resolveQuizShortBookends(
  deps: QuizShortBookendSelectionDeps,
  quizShort: QuizShort,
): Promise<ReadyQuizShortBookends | null> {
  const snapshot = await pinQuizShortBookends(deps, quizShort);
  if (!snapshot.pair_id) return null;
  const pair = await deps.store.getPair(quizShort.channel_id, snapshot.pair_id);
  const ready = pair ? await withPaths(deps, pair) : null;
  if (!ready) {
    throw new RepositoryError(
      "Pinned Short Intro/Outro pair is unavailable. Restore it or change the Short Intro & Outro setting.",
      "QUIZ_SHORT_BOOKEND_UNAVAILABLE",
    );
  }
  if ((await quizShortBookendFingerprint(ready)) !== snapshot.fingerprint) {
    throw new RepositoryError(
      "Pinned Short Intro/Outro media changed. Restore it or change the Short Intro & Outro setting.",
      "QUIZ_SHORT_BOOKEND_CHANGED",
    );
  }
  return { snapshot, ...ready };
}
