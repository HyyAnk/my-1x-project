const PART_TWO_DELIMITER = "================================================================================\nPART 2:";

export type TwoPartScriptPrompt = {
  isTwoPart: boolean;
  hasPartTwoDelimiter: boolean;
  partOneText: string;
  partTwoText: string;
};

/** Splits a stitched two-part video prompt into its Part 1 and Part 2 sections. */
export function splitTwoPartScriptPrompt(prompt: string): TwoPartScriptPrompt {
  const isTwoPart = Boolean(prompt && prompt.includes("PART 1:") && prompt.includes(PART_TWO_DELIMITER));
  const partTwoIndex = prompt ? prompt.indexOf(PART_TWO_DELIMITER) : -1;
  const hasPartTwoDelimiter = partTwoIndex !== -1;
  const canSplit = isTwoPart && hasPartTwoDelimiter;
  return {
    isTwoPart,
    hasPartTwoDelimiter,
    partOneText: canSplit ? prompt.slice(0, partTwoIndex).trim() : "",
    partTwoText: canSplit ? prompt.slice(partTwoIndex).trim() : "",
  };
}
