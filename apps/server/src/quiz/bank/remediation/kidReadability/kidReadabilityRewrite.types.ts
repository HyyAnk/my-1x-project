/** The narrated copy of one bank question sent for a kid-friendly rewrite. */
export interface KidReadabilityRewriteInput {
  id: string;
  question: string;
  correctAnswer: string;
  explanation: string;
  funFact: string;
}

export interface KidReadabilityRewrite {
  id: string;
  explanation: string;
  funFact: string;
}

export interface KidReadabilityRejection {
  id: string;
  reason: string;
}

export interface KidReadabilityBatchResult {
  accepted: KidReadabilityRewrite[];
  rejected: KidReadabilityRejection[];
}
