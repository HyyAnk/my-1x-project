import type { TrademarkIpDef } from "./rules/ruleTypes.js";
import { GAME_IP_RULES } from "./rules/gameIpRules.js";
import { DISNEY_CORE_RULES } from "./rules/disneyCoreRules.js";
import { CLASSIC_CARTOON_RULES } from "./rules/classicCartoonRules.js";
import { ANIMATION_STUDIO_RULES } from "./rules/animationStudioRules.js";
import { CINEMA_IP_RULES } from "./rules/cinemaIpRules.js";
import { isDisambiguatedSafeEntity } from "./rules/disambiguationRules.js";

export type { TrademarkIpDef };
export { isDisambiguatedSafeEntity };

export const KNOWN_TRADEMARK_IP_DEFS: TrademarkIpDef[] = [
  ...GAME_IP_RULES,
  ...DISNEY_CORE_RULES,
  ...CLASSIC_CARTOON_RULES,
  ...ANIMATION_STUDIO_RULES,
  ...CINEMA_IP_RULES,
];
