import type { ChannelMascotConfig, MascotProfile, QuizV2 } from "@studio/shared";

export type MascotStyleSelectionInput = {
  quiz: QuizV2;
  mascotStyleId?: string | null;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
};

/** Resolves the mascot style the composition should render, from the explicit id down to the profile default. */
export function resolveChosenMascotStyleId(input: MascotStyleSelectionInput): string | null | undefined {
  return (
    input.mascotStyleId ??
    (input.quiz as { quiz_config?: { mascot_style_id?: string } }).quiz_config?.mascot_style_id ??
    (input as { quiz_config?: { mascot_style_id?: string } }).quiz_config?.mascot_style_id ??
    (input.mascotConfig as { mascot_style_id?: string } | null | undefined)?.mascot_style_id ??
    input.mascot?.active_style_id
  );
}
