import { CheckCircle, Smiley } from "@phosphor-icons/react";
import { getCountryName, getLanguageDisplay, type Channel, type MascotProfile } from "@studio/shared";
import { CountryFlag } from "../../../components/CountryFlag";
import type { useStageStudio } from "../hooks/useStageStudio";

type StageSingleChannelMascotPickerProps = {
  studio: ReturnType<typeof useStageStudio>;
  targetChannel: Channel;
  allMascots: MascotProfile[];
};

export function StageSingleChannelMascotPicker({ studio, targetChannel, allMascots }: StageSingleChannelMascotPickerProps) {
  const { t, selectedMascotId, setSelectedMascotId } = studio;

  return (
    <div className="stage-inspector-tab-content">
      {/* Channel Summary */}
      <div className="inspector-card">
        <div className="inspector-card-header">
          <span className="inspector-card-title">{t("stageStudio.targetChannelTitle")}</span>
        </div>
        <div className="channel-blueprint-mini">
          <div className="blueprint-row">
            <span className="blueprint-label">{t("stageStudio.channelNameLabel")}</span>
            <strong className="blueprint-val">{targetChannel.display_name || targetChannel.slug}</strong>
          </div>
          <div className="blueprint-row">
            <span className="blueprint-label">{t("stageStudio.regionLabel")}</span>
            <span className="blueprint-val flag-val">
              <CountryFlag code={targetChannel.country || targetChannel.market} size={14} />
              <span>
                {getCountryName(targetChannel.country || targetChannel.market)} ({getLanguageDisplay(targetChannel.language || "English")})
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Mascot Picker Grid */}
      <div className="inspector-card">
        <div className="inspector-card-header">
          <span className="inspector-card-title">{t("stageStudio.selectMascotTitle")}</span>
        </div>

        <div className="mascot-cards-picker-list">
          {/* No Mascot Option */}
          <button
            type="button"
            className={`mascot-picker-card ${selectedMascotId === null ? "is-selected" : ""}`}
            onClick={() => setSelectedMascotId(null)}
          >
            <div className="mascot-picker-avatar empty">
              <Smiley size={22} style={{ color: "var(--muted)" }} />
            </div>
            <div className="mascot-picker-details">
              <strong>{t("stageStudio.noMascotOption")}</strong>
              <small>{t("stageStudio.noMascotDesc")}</small>
            </div>
            {selectedMascotId === null ? <CheckCircle size={16} weight="fill" className="selected-check-icon" /> : null}
          </button>

          {/* Mascot Options */}
          {allMascots.map((m) => {
            const isSelected = selectedMascotId === m.id;
            const activeStyle = m.styles?.find((s) => s.id === m.active_style_id) || m.styles?.find((s) => s.is_default) || m.styles?.[0];
            const hasThinking =
              (activeStyle?.states?.thinking?.filter((v) => Boolean(v?.image_url)).length || 0) > 0 ||
              Boolean(m.actions?.thinking?.sprite_url);
            const hasCelebrate =
              (activeStyle?.states?.celebrate?.filter((v) => Boolean(v?.image_url)).length || 0) > 0 ||
              Boolean(m.actions?.celebrate?.sprite_url);
            const readyStates = (hasThinking ? 1 : 0) + (hasCelebrate ? 1 : 0);
            const avatarThumbnail = activeStyle?.anchor_image_url || m.master_image_url;

            return (
              <button
                key={m.id}
                type="button"
                className={`mascot-picker-card ${isSelected ? "is-selected" : ""}`}
                onClick={() => setSelectedMascotId(m.id)}
              >
                <div className="mascot-picker-avatar">
                  {avatarThumbnail ? (
                    <img src={avatarThumbnail} alt={m.name} />
                  ) : (
                    <Smiley size={22} style={{ color: m.color_theme || "var(--accent)" }} />
                  )}
                </div>
                <div className="mascot-picker-details">
                  <div className="mascot-picker-name-row">
                    <strong>{m.name}</strong>
                    <span className="style-chip">{m.visual_style.replace("_", " ")}</span>
                  </div>
                  <small>{t("stageStudio.posesReadyBadge", { count: readyStates })}</small>
                </div>
                {isSelected ? <CheckCircle size={16} weight="fill" className="selected-check-icon" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
