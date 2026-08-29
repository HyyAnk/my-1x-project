export type SequenceDraftSnapshot = { sequenceNumber: number; modified_at: string };

export function planSequenceResume(
  sectionCount: number,
  drafts: SequenceDraftSnapshot[],
  scriptModifiedAt: string,
  invalidateDrafts: boolean,
): { shouldClearDrafts: boolean; reusedSequenceNumbers: number[]; pendingSequenceNumbers: number[] } {
  const expected = Array.from({ length: Math.max(0, sectionCount) }, (_, index) => index + 1);
  const scriptTimestamp = Date.parse(scriptModifiedAt);
  const validDrafts = drafts.filter((draft) => expected.includes(draft.sequenceNumber));
  const hasUnexpectedDraft = drafts.some((draft) => !expected.includes(draft.sequenceNumber));
  const hasStaleDraft = validDrafts.some((draft) => {
    const draftTimestamp = Date.parse(draft.modified_at);
    return !Number.isFinite(scriptTimestamp) || !Number.isFinite(draftTimestamp) || draftTimestamp < scriptTimestamp;
  });
  const shouldClearDrafts = invalidateDrafts || hasUnexpectedDraft || hasStaleDraft;
  const reusable = shouldClearDrafts ? [] : [...new Set(validDrafts.map((draft) => draft.sequenceNumber))].sort((a, b) => a - b);
  const reusableSet = new Set(reusable);
  return {
    shouldClearDrafts,
    reusedSequenceNumbers: reusable,
    pendingSequenceNumbers: expected.filter((sequenceNumber) => !reusableSet.has(sequenceNumber)),
  };
}
