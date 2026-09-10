import { calculateScriptTotalDuration, type ReelScript, type ShortReelRecord, type Task } from "@studio/shared";
import { canExportReel } from "../../shortReel/utils/shortReelStudioRules";
import { isTaskActive } from "../../../lib/utils";
import { shortReelApi } from "../../../api/shortReelApi";
import { buildHash } from "../../../hooks/useRouter";

export type ShortReelStatus = "draft" | "generating" | "ready" | "exported";

export interface ShortReelCardViewModel {
  status: ShortReelStatus;
  statusLabel: string;
  hasActiveTask: boolean;
  activeProgressMessage: string | null;
  archetypeLabel: string;
  durationLabel: string;
  coverUrl: string | null;
  cleanTitle: string;
  premise: string;
  questionText: string;
  studioUrl: string;
  canQuickDownload: boolean;
  exportUrl: string | null;
}

/** Strips trailing dots from topic title */
export function cleanTopicTitle(title: string): string {
  return title.replace(/\.+$/, "").trim();
}

/** Formats archetype into readable title */
export function formatArchetypeLabel(archetypeId: string): string {
  if (archetypeId === "versus_faceoff") return "Versus Faceoff";
  if (archetypeId === "deep_trivia") return "Deep Trivia";
  return archetypeId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Formats duration from script or fallback standard range */
export function formatReelDuration(script: ReelScript | null): string {
  if (!script) return "24–30s";
  try {
    const total = calculateScriptTotalDuration(script);
    return `${total}s`;
  } catch {
    return "24–30s";
  }
}

/** Computes the overall short-reel status from units and active tasks */
export function computeShortReelStatus(
  reel: ShortReelRecord,
  tasks: Task[],
): { status: ShortReelStatus; label: string; activeProgressMessage: string | null } {
  const reelTasks = tasks.filter((t) => t.reel_id === reel.reel_id);
  const activeTask = reelTasks.find(isTaskActive);
  const anyUnitPending = Object.values(reel.units).some((u) => u.state === "pending");

  if (activeTask || anyUnitPending) {
    const progress = activeTask?.progress_message || "Generating content...";
    return { status: "generating", label: "Generating", activeProgressMessage: progress };
  }

  const exportCompleted = reelTasks.some((t) => t.short_reel_request?.target === "package" && t.status === "COMPLETED");
  if (exportCompleted) {
    return { status: "exported", label: "Exported", activeProgressMessage: null };
  }

  if (canExportReel(reel)) {
    return { status: "ready", label: "Ready", activeProgressMessage: null };
  }

  return { status: "draft", label: "Draft", activeProgressMessage: null };
}

/** Checks whether a Short-Reel matches a free-text search query */
export function matchesShortReelSearch(reel: ShortReelRecord, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const title = reel.topic.title.toLowerCase();
  const premise = reel.topic.premise.toLowerCase();
  const questionText = reel.source.question_text.toLowerCase();
  const hook = (reel.topic.hook ?? "").toLowerCase();

  return title.includes(query) || premise.includes(query) || questionText.includes(query) || hook.includes(query);
}

/** Builds presentation-ready view model for ShortReelCard */
export function buildShortReelCardViewModel(reel: ShortReelRecord, tasks: Task[]): ShortReelCardViewModel {
  const { status, label: statusLabel, activeProgressMessage } = computeShortReelStatus(reel, tasks);
  const hasActiveTask = status === "generating";
  const archetypeLabel = formatArchetypeLabel(reel.source.archetype_id);
  const durationLabel = formatReelDuration(reel.script);

  const coverAssetId = reel.units.cover.last_accepted_payload?.asset_id;
  const coverUrl = coverAssetId ? shortReelApi.getAssetUrl(reel.channel_id, reel.reel_id, coverAssetId) : null;

  const studioUrl = buildHash({
    page: "channels",
    channelId: reel.channel_id,
    shortReelId: reel.reel_id,
  });

  const canQuickDownload = status === "ready" || status === "exported";
  const exportUrl = canQuickDownload ? shortReelApi.getExportUrl(reel.channel_id, reel.reel_id, reel.revision) : null;

  return {
    status,
    statusLabel,
    hasActiveTask,
    activeProgressMessage,
    archetypeLabel,
    durationLabel,
    coverUrl,
    cleanTitle: cleanTopicTitle(reel.topic.title),
    premise: reel.topic.premise,
    questionText: reel.source.question_text,
    studioUrl,
    canQuickDownload,
    exportUrl,
  };
}
