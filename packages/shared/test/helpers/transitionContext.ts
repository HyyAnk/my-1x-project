import type { TransitionContext, TransitionImplementation } from "../../src/transitions/transition.types.js";

export function transitionContext(overrides?: Partial<TransitionContext>): TransitionContext {
  return {
    instanceId: "test-instance-01",
    placement: "scene",
    fps: { numerator: 30, denominator: 1 },
    startFrame: 0,
    boundaryFrame: 45,
    availableEndFrameExclusive: 90,
    width: 1920,
    height: 1080,
    fromColor: "#fbbf24",
    toColor: "#cffafe",
    inkColor: "#1f2937",
    ...overrides,
  };
}

export function contextForDefinition(
  definition: Pick<TransitionImplementation, "placements">,
  overrides?: Partial<TransitionContext>,
): TransitionContext {
  const placement = definition.placements[0] ?? "scene";
  return transitionContext({
    placement,
    ...overrides,
  });
}
