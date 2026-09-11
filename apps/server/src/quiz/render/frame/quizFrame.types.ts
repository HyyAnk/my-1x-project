export type FrameRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type FixedFrameRole = "counter" | "question" | "brand" | "thinking" | "fact";

export type LandscapeFrameGeometry = Readonly<{
  canvas: Readonly<{ width: number; height: number }>;
  question: FrameRect;
  thinking: FrameRect;
  fact: FrameRect;
  arena: FrameRect;
  timerProtection: FrameRect;
  counter: Readonly<{ centerX: number; top: number }>;
  brand: Readonly<{ centerX: number; top: number; width: number }>;
}>;
