import type { QuizPortraitLayoutId } from "@studio/shared";
import type { QuizLayoutRenderDefinition } from "../types.js";
import { shortStackListLayout } from "./shortStackList.js";
import { shortMediaTopChoicesLayout } from "./shortMediaTopChoices.js";
import { shortVersusTwoLayout } from "./shortVersusTwo.js";
import { shortVerdictYesNoLayout } from "./shortVerdictYesNo.js";

/** Portrait (Quiz Short) production renderers, one per catalog entry. */
export const QUIZ_PORTRAIT_LAYOUT_RENDERERS = {
  short_stack_list: shortStackListLayout,
  short_media_top_choices: shortMediaTopChoicesLayout,
  short_versus_two: shortVersusTwoLayout,
  short_verdict_yes_no: shortVerdictYesNoLayout,
} satisfies Record<QuizPortraitLayoutId, QuizLayoutRenderDefinition>;
