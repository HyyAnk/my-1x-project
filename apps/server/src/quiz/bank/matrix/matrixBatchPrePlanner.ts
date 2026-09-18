import type { BankQuestion, MatrixComboCandidate } from "@studio/shared";
import type { PlannedBatchChunk, PlanBatchChunksOptions } from "./types/matrixPlanner.types.js";
import { selectAutoCandidates } from "./selectors/matrixAutoSelector.js";
import { selectManualCandidates } from "./selectors/matrixManualSelector.js";

/**
 * Creates a virtual placeholder question used for multi-chunk reservation tracking.
 */
function createVirtualReservationQuestion(
  candidate: MatrixComboCandidate,
  chunkIdx: number,
  difficulty: number,
  nowIso: string,
): BankQuestion {
  return {
    id: `virtual_plan_${chunkIdx}_${candidate.entity_id}`,
    entity_id: candidate.entity_id,
    archetype_id: candidate.archetype_id,
    domain_id: candidate.domain_id,
    subtopic_id: candidate.subtopic_id,
    language: "en",
    question: `Virtual reservation for ${candidate.entity_name}`,
    format: "multiple_choice",
    choices: [
      { id: "c1", text: "Choice 1" },
      { id: "c2", text: "Choice 2" },
    ],
    correct_choice_id: "c1",
    explanation: "Virtual reservation explanation",
    fun_fact: "",
    age_band: "family",
    difficulty,
    tags: [],
    status: "approved",
    created_at: nowIso,
    updated_at: nowIso,
  };
}

/**
 * Pre-Allocation Matrix Planner: Plans and reserves multi-chunk candidate batches upfront
 * using virtual coverage tracking.
 */
export function planBatchChunks(questions: BankQuestion[], options: PlanBatchChunksOptions): PlannedBatchChunk[] {
  const targetCount = Math.max(1, options.targetCount);
  const chunkSize = Math.max(1, options.chunkSize || 20);
  const totalChunks = Math.ceil(targetCount / chunkSize);
  const mode = options.mode || "auto";

  // In-memory virtual question state for reservation tracking across chunks
  const virtualQuestions: BankQuestion[] = [...questions];
  const plannedChunks: PlannedBatchChunk[] = [];

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const thisChunkSize = Math.min(chunkSize, targetCount - chunkIdx * chunkSize);
    if (thisChunkSize <= 0) break;

    const candidatesForChunk: MatrixComboCandidate[] =
      mode === "manual"
        ? selectManualCandidates(virtualQuestions, {
            count: thisChunkSize,
            domain_id: options.domainId,
            subtopic_id: options.subtopicId,
            archetype_ids: options.archetypeId ? [options.archetypeId] : undefined,
            difficulty: options.difficulty,
            entities: options.entities,
            baseDir: options.baseDir,
          })
        : selectAutoCandidates(virtualQuestions, {
            count: thisChunkSize,
            domain_id: options.domainId,
            archetype_ids: options.archetypeId ? [options.archetypeId] : undefined,
            entities: options.entities,
            baseDir: options.baseDir,
          });

    const domainId = candidatesForChunk[0]?.domain_id || options.domainId || "general";
    const archetypeId = candidatesForChunk[0]?.archetype_id || options.archetypeId || "speed_blitz";
    const subtopicId = candidatesForChunk[0]?.subtopic_id || options.subtopicId || "general";

    // Reserve chosen candidates in virtualQuestions so subsequent chunks select distinct entities
    const nowIso = new Date().toISOString();
    for (const c of candidatesForChunk) {
      virtualQuestions.push(createVirtualReservationQuestion(c, chunkIdx, options.difficulty ?? 2, nowIso));
    }

    plannedChunks.push({
      chunkIndex: chunkIdx,
      totalChunks,
      chunkSize: thisChunkSize,
      domainId,
      archetypeId,
      subtopicId,
      candidates: candidatesForChunk,
    });
  }

  return plannedChunks;
}
