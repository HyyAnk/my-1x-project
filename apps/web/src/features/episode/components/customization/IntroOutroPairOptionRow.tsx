import type { IntroOutroStyle } from "@studio/shared";
import { api } from "../../../../api";
import { getIntroOutroCategoryInfo } from "../../utils/introOutroStyleHelpers";
import { StyleOptionRow } from "./StyleOptionRow";

type Props = {
  channelId: string;
  style: IntroOutroStyle;
  isDefault: boolean;
  matchesPreset: boolean;
  checked: boolean;
  onSelect: () => void;
};

function formatPairDuration(style: IntroOutroStyle): string {
  if (!style.intro || !style.outro) return "";
  return ` · ${style.intro.duration_seconds.toFixed(0)}s / ${style.outro.duration_seconds.toFixed(0)}s`;
}

function resolvePairBadge(isDefault: boolean, matchesPreset: boolean): string | undefined {
  if (isDefault) return "Default";
  return matchesPreset ? "Matches Style" : undefined;
}

export function IntroOutroPairOptionRow({ channelId, style, isDefault, matchesPreset, checked, onSelect }: Props) {
  const categoryInfo = getIntroOutroCategoryInfo(style.style_preset_id);
  return (
    <StyleOptionRow
      name="intro_outro_choice"
      label={style.name}
      leading={
        style.intro?.thumbnail_filename ? (
          <img
            src={api.getIntroOutroThumbUrl(channelId, style.style_id, "intro")}
            className="style-option-thumb"
            alt={style.name}
          />
        ) : (
          <span className="style-option-emoji">{categoryInfo.icon}</span>
        )
      }
      subtitle={`${categoryInfo.name}${formatPairDuration(style)}`}
      badge={resolvePairBadge(isDefault, matchesPreset)}
      checked={checked}
      onSelect={onSelect}
    />
  );
}
