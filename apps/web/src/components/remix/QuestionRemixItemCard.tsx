import type { QuestionHistoryCheckResult } from "@studio/shared";
import { QuestionRemixCardHeader } from "./QuestionRemixCardHeader";
import { QuestionRemixCompactCard } from "./QuestionRemixCompactCard";
import { QuestionRemixComparisonBody } from "./QuestionRemixComparisonBody";

type QuestionHistoryItem = NonNullable<QuestionHistoryCheckResult["items"]>[number];

export interface QuestionRemixItemCardProps {
  item: QuestionHistoryItem;
  index: number;
  isExpandedClean: boolean;
  isRemixing: boolean;
  remixAction?: { questionId: string; mode: "rephrase" | "replace" } | null;
  onToggleExpandClean: (id: string) => void;
  onRemixSingle: (questionId: string, mode: "rephrase" | "replace") => Promise<void> | void;
}

export function QuestionRemixItemCard({
  item,
  index,
  isExpandedClean,
  isRemixing,
  remixAction,
  onToggleExpandClean,
  onRemixSingle,
}: QuestionRemixItemCardProps) {
  const qId = item.current_question_id || String(index);
  const isDupe = item.status === "duplicate";
  const isRemixed = item.status === "remixed";
  const isClean = item.status === "passed";

  // 1. CLEAN / PASSED QUESTION (Compact 1-Column Format)
  if (isClean && !isExpandedClean) {
    return (
      <QuestionRemixCompactCard
        item={item}
        index={index}
        qId={qId}
        isRemixing={isRemixing}
        remixAction={remixAction}
        onRemixSingle={onRemixSingle}
      />
    );
  }

  // 2. DUPLICATE OR REMIXED QUESTION (Expanded 2-Column Comparison Format)
  return (
    <div className={`remix-card ${isDupe ? "is-duplicate" : isRemixed ? "is-remixed" : "is-clean"}`}>
      <QuestionRemixCardHeader
        item={item}
        index={index}
        qId={qId}
        isDupe={isDupe}
        isRemixed={isRemixed}
        isClean={isClean}
        isRemixing={isRemixing}
        remixAction={remixAction}
        onToggleExpandClean={onToggleExpandClean}
        onRemixSingle={onRemixSingle}
      />
      <QuestionRemixComparisonBody item={item} />
    </div>
  );
}
