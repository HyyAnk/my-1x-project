import { QUIZ_SHORT_BOOKEND_HEIGHT, QUIZ_SHORT_BOOKEND_WIDTH, type QuizShortTitleCanvas } from "@studio/shared";

export type TitleCanvasField = keyof QuizShortTitleCanvas;

export const TITLE_CANVAS_FIELDS: ReadonlyArray<{ key: TitleCanvasField; label: string }> = [
  { key: "x", label: "Left" },
  { key: "y", label: "Top" },
  { key: "width", label: "Width" },
  { key: "height", label: "Height" },
];

/** CSS percentages that place the title area over a scaled 9:16 thumbnail. */
export function titleCanvasOverlayStyle(canvas: QuizShortTitleCanvas): Record<"left" | "top" | "width" | "height", string> {
  const percent = (value: number, total: number) => `${((value / total) * 100).toFixed(2)}%`;
  return {
    left: percent(canvas.x, QUIZ_SHORT_BOOKEND_WIDTH),
    top: percent(canvas.y, QUIZ_SHORT_BOOKEND_HEIGHT),
    width: percent(canvas.width, QUIZ_SHORT_BOOKEND_WIDTH),
    height: percent(canvas.height, QUIZ_SHORT_BOOKEND_HEIGHT),
  };
}

/** Explains why a title area cannot be saved, or returns null when it fits the 1080x1920 frame. */
export function titleCanvasError(canvas: QuizShortTitleCanvas): string | null {
  const values = Object.values(canvas);
  if (values.some((value) => !Number.isInteger(value) || value < 0)) return "Use whole, non-negative pixel values.";
  if (canvas.width < 200 || canvas.height < 200) return "The title area must be at least 200×200 px.";
  if (canvas.x + canvas.width > QUIZ_SHORT_BOOKEND_WIDTH) return "Left + Width must stay within 1080 px.";
  if (canvas.y + canvas.height > QUIZ_SHORT_BOOKEND_HEIGHT) return "Top + Height must stay within 1920 px.";
  return null;
}
