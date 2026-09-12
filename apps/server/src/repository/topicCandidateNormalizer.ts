import { TopicCandidateSchema, TopicRunCandidateSchema, type TopicCandidate } from "@studio/shared";
import type { TopicRun } from "./helpers.js";

export function extractUniqueCandidates(runs: TopicRun[]): TopicCandidate[] {
  const sortedRuns = [...runs].sort((a, b) => (b.generated_at || "").localeCompare(a.generated_at || ""));
  const seenTopicIds = new Set<string>();
  const all: TopicCandidate[] = [];

  for (const run of sortedRuns) {
    for (const candidate of run.candidates) {
      const runCandidateParsed = TopicRunCandidateSchema.safeParse(candidate);
      const parsed = runCandidateParsed.success ? runCandidateParsed.data : TopicCandidateSchema.safeParse(candidate).data;
      if (parsed && !seenTopicIds.has(parsed.topic_id)) {
        seenTopicIds.add(parsed.topic_id);
        all.push({
          ...parsed,
          ...(run.run_id && !parsed.run_id ? { run_id: run.run_id } : {}),
        });
      }
    }
  }

  return all.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}
