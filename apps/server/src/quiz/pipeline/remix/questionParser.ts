import { type QuizQuestion, QuizQuestionSchema, quizChoiceCountForFormat } from "@studio/shared";

export function normalizeRawQuizQuestion(raw: unknown, targetFallback?: QuizQuestion): QuizQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : (targetFallback?.id ?? "q-1");
  const number = typeof obj.number === "number" && obj.number > 0 ? obj.number : (targetFallback?.number ?? 1);
  const format = (
    typeof obj.format === "string" && obj.format ? obj.format : (targetFallback?.format ?? "multiple_choice")
  ) as QuizQuestion["format"];
  const difficulty =
    typeof obj.difficulty === "number" && obj.difficulty >= 1 && obj.difficulty <= 5 ? obj.difficulty : (targetFallback?.difficulty ?? 2);

  let question = typeof obj.question === "string" ? obj.question.trim() : (targetFallback?.question ?? "");
  question = question.replace(/^(?:Challenge|Quiz|Can you solve|Can you guess)\s*:\s*/i, "").trim();

  let choices: Array<{ id: string; text: string }> = [];
  if (Array.isArray(obj.choices)) {
    choices = obj.choices.map((c: unknown, idx: number) => {
      if (typeof c === "string") {
        return { id: `c${idx + 1}`, text: c.trim() };
      }
      if (typeof c === "object" && c !== null) {
        const itemObj = c as Record<string, unknown>;
        const rawCId =
          typeof itemObj.id === "string" && /^[a-z][a-z0-9_-]{0,31}$/i.test(itemObj.id) ? itemObj.id.toLowerCase() : `c${idx + 1}`;
        const rawCText = typeof itemObj.text === "string" ? itemObj.text.trim() : `Option ${idx + 1}`;
        return { id: rawCId, text: rawCText };
      }
      return { id: `c${idx + 1}`, text: `Option ${idx + 1}` };
    });
  } else if (targetFallback?.choices) {
    choices = [...targetFallback.choices];
  }

  // Ensure unique choice texts
  const seenTexts = new Set<string>();
  choices = choices.filter((c) => {
    const norm = c.text.toLowerCase();
    if (seenTexts.has(norm)) return false;
    seenTexts.add(norm);
    return true;
  });

  const requiredChoiceCount = quizChoiceCountForFormat(format);
  let correctChoiceId = typeof obj.correct_choice_id === "string" ? obj.correct_choice_id.toLowerCase() : (choices[0]?.id ?? "c1");

  if (choices.length !== requiredChoiceCount) {
    throw new Error(
      `QUIZ_CHOICE_COUNT_INVALID: Question ${number} (${format}) returned ${choices.length} choices; exactly ${requiredChoiceCount} required`,
    );
  }

  // If correct choice matches text rather than ID
  const matchedChoice = choices.find((c) => c.id === correctChoiceId || c.text.toLowerCase() === correctChoiceId.toLowerCase());
  if (matchedChoice) {
    correctChoiceId = matchedChoice.id;
  } else if (choices.length > 0) {
    correctChoiceId = choices[0].id;
  }

  if (!choices.some((c) => c.id === correctChoiceId)) {
    correctChoiceId = choices[0]?.id ?? "c1";
  }

  const explanation =
    typeof obj.explanation === "string" && obj.explanation.trim()
      ? obj.explanation.trim()
      : (targetFallback?.explanation ?? "Correct answer explanation.");

  const fun_fact = typeof obj.fun_fact === "string" ? obj.fun_fact.trim() : (targetFallback?.fun_fact ?? "");
  const visual_opportunity =
    typeof obj.visual_opportunity === "string" ? obj.visual_opportunity.trim() : (targetFallback?.visual_opportunity ?? "");

  const candidate = {
    id,
    number,
    format,
    difficulty,
    question,
    choices,
    correct_choice_id: correctChoiceId,
    explanation,
    fun_fact,
    source_ids: Array.isArray(obj.source_ids) ? (obj.source_ids as string[]) : (targetFallback?.source_ids ?? []),
    visual_opportunity,
    validation: { semantic_status: "validated" as const, source_coverage: false, fact_locked: true },
  };

  return QuizQuestionSchema.parse(candidate);
}

export function parseQuizQuestionsFromOutput(rawOutput: string, fallbackMap: Map<string, QuizQuestion>): QuizQuestion[] {
  let cleaned = rawOutput.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  let parsedJson: unknown = null;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        parsedJson = JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
      } catch {}
    }

    if (!parsedJson) {
      const objStart = cleaned.indexOf("{");
      const objEnd = cleaned.lastIndexOf("}");
      if (objStart >= 0 && objEnd > objStart) {
        try {
          parsedJson = JSON.parse(cleaned.slice(objStart, objEnd + 1));
        } catch {}
      }
    }
  }

  if (!parsedJson) {
    const preview = cleaned.length > 120 ? `${cleaned.slice(0, 120)}...` : cleaned;
    throw new Error(`Failed to extract valid JSON questions from LLM response (preview: "${preview}")`);
  }

  const rawItems: unknown[] = Array.isArray(parsedJson)
    ? parsedJson
    : typeof parsedJson === "object" &&
        parsedJson !== null &&
        "questions" in parsedJson &&
        Array.isArray((parsedJson as Record<string, unknown>).questions)
      ? ((parsedJson as Record<string, unknown>).questions as unknown[])
      : [parsedJson];

  if (rawItems.length === 0) {
    throw new Error("LLM response contained an empty question list");
  }

  const results: QuizQuestion[] = [];
  for (const item of rawItems) {
    const rawId = typeof (item as Record<string, unknown>)?.id === "string" ? ((item as Record<string, unknown>).id as string) : undefined;
    const fallback = rawId ? fallbackMap.get(rawId) : fallbackMap.values().next().value;
    const normalized = normalizeRawQuizQuestion(item, fallback);
    if (normalized) results.push(normalized);
  }

  if (results.length === 0) {
    throw new Error(`Could not parse any valid QuizQuestion from items (${rawItems.length} items evaluated)`);
  }

  return results;
}
