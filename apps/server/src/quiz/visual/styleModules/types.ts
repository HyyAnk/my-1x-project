import type { StyleSlot } from "@studio/shared";
import type { AnswerCardSkin } from "../elements/answerCard/types.js";
import type { BackgroundRenderContext } from "../elements/background/types.js";
import type { CounterBadgeRenderInput } from "../elements/counterBadge/types.js";
import type { QuestionBoxRenderInput } from "../elements/questionBox/types.js";
import type { ThinkingBarRenderInput } from "../elements/thinkingBar/types.js";
import type { StyleModuleManifest } from "./manifestSchema.js";

export interface StyleModuleRenderer<TContext> {
  renderHtml(context: TContext): string;
  renderCss(): string;
}

export interface StyleModule<TSlot extends StyleSlot, TRenderer> {
  manifest: StyleModuleManifest & { slot: TSlot };
  renderer: TRenderer;
}

export type ThinkingBarStyleModule = StyleModule<"thinking-bar", StyleModuleRenderer<ThinkingBarRenderInput>>;
export type QuestionBoxStyleModule = StyleModule<"question-box", StyleModuleRenderer<QuestionBoxRenderInput>>;
export type AnswerCardStyleModule = StyleModule<"answer-card", AnswerCardSkin>;
export type CounterStyleModule = StyleModule<"counter", StyleModuleRenderer<CounterBadgeRenderInput>>;
export type BackgroundStyleModule = StyleModule<"background", StyleModuleRenderer<BackgroundRenderContext>>;

export type SlotScopedStyleModule =
  | ThinkingBarStyleModule
  | QuestionBoxStyleModule
  | AnswerCardStyleModule
  | CounterStyleModule
  | BackgroundStyleModule;
