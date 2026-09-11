export type FactFitResult =
  { status: "fit"; fontSize: number; lineHeight: number } | { status: "overflow"; code: "QUIZ_FACT_TEXT_OVERFLOW" };

export const FACT_FIT_SIZES = [38, 37, 36, 35, 34, 33, 32] as const;
export const FACT_MAX_LINES = 3;

export function resolveFactFit(fits: (fontSize: number, lineHeight: number, maxLines: number) => boolean): FactFitResult {
  for (const fontSize of FACT_FIT_SIZES) {
    const lineHeight = fontSize === 32 ? 1.15 : 1.2;
    if (fits(fontSize, lineHeight, FACT_MAX_LINES)) {
      return { status: "fit", fontSize, lineHeight };
    }
  }
  return { status: "overflow", code: "QUIZ_FACT_TEXT_OVERFLOW" };
}

export function factTextFitPolicyScript(): string {
  return `const FACT_FIT_SIZES = ${JSON.stringify(FACT_FIT_SIZES)};
const FACT_MAX_LINES = ${FACT_MAX_LINES};
const resolveFactFit = (${resolveFactFit.toString()});`;
}
