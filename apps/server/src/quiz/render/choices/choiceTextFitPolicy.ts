export type ChoiceGroupFitResult = {
  fontSize: number;
  lines: number;
  status: "fit" | "overflow";
};

export type ResolveChoiceGroupFitInput = {
  minFontSize: number;
  maxFontSize: number;
  maxLines: number;
  multilineGain: number;
  fits: (fontSize: number, lines: number) => boolean;
};

type ChoiceGroupFitResolver = (input: ResolveChoiceGroupFitInput) => ChoiceGroupFitResult;

function createChoiceGroupFitResolver(): ChoiceGroupFitResolver {
  function largestFittingSize(min: number, max: number, fits: (size: number) => boolean): number | null {
    let low = min;
    let high = max;
    let result: number | null = null;

    while (low <= high) {
      const candidate = Math.floor((low + high) / 2);
      if (fits(candidate)) {
        result = candidate;
        low = candidate + 1;
      } else {
        high = candidate - 1;
      }
    }

    return result;
  }

  return function resolveChoiceGroupFit(input: ResolveChoiceGroupFitInput): ChoiceGroupFitResult {
    const minFontSize = Math.max(1, Math.ceil(input.minFontSize));
    const maxFontSize = Math.max(minFontSize, Math.floor(input.maxFontSize));
    const maxLines = Math.max(1, Math.floor(input.maxLines));
    const oneLineSize = largestFittingSize(minFontSize, maxFontSize, (size) => input.fits(size, 1));
    let selected = oneLineSize === null ? null : { fontSize: oneLineSize, lines: 1 };

    for (let lines = 2; lines <= maxLines; lines += 1) {
      const size = largestFittingSize(minFontSize, maxFontSize, (candidate) => input.fits(candidate, lines));
      if (size !== null && (!selected || size >= selected.fontSize + input.multilineGain)) {
        selected = { fontSize: size, lines };
      }
    }

    return selected ? { ...selected, status: "fit" } : { fontSize: minFontSize, lines: maxLines, status: "overflow" };
  };
}

export const resolveChoiceGroupFit = createChoiceGroupFitResolver();

export function choiceTextFitPolicyScript(): string {
  return `const __name=(target)=>target;
const resolveChoiceGroupFit=(${createChoiceGroupFitResolver.toString()})();`;
}
