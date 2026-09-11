export type TransitionPlacement = "intro" | "scene";

export type FrameRate = Readonly<{
  numerator: number;
  denominator: number;
}>;

export type TransitionSelection = Readonly<{
  id: string;
  durationSeconds?: number;
}>;

export type TransitionSettings = Readonly<{
  intro?: TransitionSelection;
  scene?: TransitionSelection;
}>;

export type TransitionContext = Readonly<{
  instanceId: string;
  placement: TransitionPlacement;
  fps: FrameRate;
  startFrame: number;
  boundaryFrame: number;
  availableEndFrameExclusive: number;
  width: number;
  height: number;
  fromColor: string;
  toColor: string;
  inkColor: string;
}>;

export type TransitionTimingAdjustment = "none" | "frame-rounded" | "window-limited";

export type ResolvedTransitionInstance = Readonly<{
  instanceId: string;
  id: string;
  implementationRevision: string;
  placement: TransitionPlacement;
  startFrame: number;
  boundaryFrame: number;
  endFrameExclusive: number;
  durationFrames: number;
  effectiveDurationSeconds: number;
  fps: FrameRate;
  timingAdjustment: TransitionTimingAdjustment;
}>;

export type TransitionHandoff =
  | { kind: "cut" }
  | { kind: "cover" | "fade-black"; progress: number };

export type TransitionImplementation = Readonly<{
  id: string;
  implementationRevision: string;
  name: string;
  placements: readonly TransitionPlacement[];
  defaultDurationSeconds: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  cssClass: string;
  handoff: TransitionHandoff;
  renderMarkup: (context: TransitionContext) => string;
  styles: string;
}>;

export type TransitionCatalogEntry = Readonly<
  Pick<
    TransitionImplementation,
    | "id"
    | "implementationRevision"
    | "name"
    | "placements"
    | "defaultDurationSeconds"
    | "minDurationSeconds"
    | "maxDurationSeconds"
    | "cssClass"
  >
>;

export type TransitionSettingSources = Readonly<{
  draft?: TransitionSettings;
  explicit?: TransitionSettings;
  preset?: TransitionSettings;
  channel?: TransitionSettings;
  defaults?: TransitionSettings;
}>;

export type ResolvedTransitionSettings = Readonly<{
  intro: TransitionSelection;
  scene: TransitionSelection;
}>;
