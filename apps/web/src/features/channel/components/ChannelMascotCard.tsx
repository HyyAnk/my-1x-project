import { CircleNotch, MonitorPlay, Smiley, Sparkle } from "@phosphor-icons/react";
import { resolveChannelMascotPlacement, type Channel, type MascotProfile } from "@studio/shared";
import { useTranslation } from "../../../i18n";

type ChannelMascotCardProps = {
  channel: Channel;
  mascotsList: MascotProfile[];
  changingMascot: boolean;
  onMascotChange: (mascotId: string | null) => Promise<void>;
  onOpenStageStudio: () => void;
};

function getMascotReadyStatesCount(mascot?: MascotProfile | null): number {
  if (!mascot) return 0;
  const activeStyle =
    mascot.styles?.find((s) => s.id === mascot.active_style_id) || mascot.styles?.find((s) => s.is_default) || mascot.styles?.[0];

  const hasThinking =
    (activeStyle?.states?.thinking?.filter((v) => Boolean(v?.image_url)).length || 0) > 0 || Boolean(mascot.actions?.thinking?.sprite_url);
  const hasCelebrate =
    (activeStyle?.states?.celebrate?.filter((v) => Boolean(v?.image_url)).length || 0) > 0 ||
    Boolean(mascot.actions?.celebrate?.sprite_url);

  return (hasThinking ? 1 : 0) + (hasCelebrate ? 1 : 0);
}

export function ChannelMascotCard({ channel, mascotsList, changingMascot, onMascotChange, onOpenStageStudio }: ChannelMascotCardProps) {
  const { t } = useTranslation();
  const assignedMascot = mascotsList.find((m) => m.id === channel.mascot_id);
  const cfg = channel.mascot_config || { enabled: true, position: "bottom_left", scale: 1.0 };
  const activeScenes = [
    cfg.show_in_intro ? t("channelDetail.sceneIntroBadge") : null,
    cfg.show_in_question !== false ? t("channelDetail.sceneQuestionBadge") : null,
    cfg.show_in_outro ? t("channelDetail.sceneOutroBadge") : null,
  ].filter(Boolean);

  const readyStatesCount = getMascotReadyStatesCount(assignedMascot);
  const p169 = resolveChannelMascotPlacement(cfg, "16:9");
  const p916 = resolveChannelMascotPlacement(cfg, "9:16");

  return (
    <div className="panel channel-mascot-card">
      <div className="panel-heading">
        <div>
          <h2>{t("channelDetail.mascotPersonaTitle")}</h2>
        </div>
        <div className="panel-actions">
          <select
            value={channel.mascot_id || ""}
            disabled={changingMascot}
            className="mascot-select-dropdown"
            onChange={(e) => void onMascotChange(e.target.value || null)}
            title={t("channelDetail.mascotSelectTitle")}
          >
            <option value="">{t("channelDetail.noMascotOption")}</option>
            {mascotsList.map((m) => (
              <option key={m.id} value={m.id}>
                🎨 {m.name} ({t("mascots.posesBadge", { count: getMascotReadyStatesCount(m) })})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="channel-mascot-card-body">
        {channel.mascot_id && assignedMascot ? (
          <div className="mascot-branding-layout">
            <div className="mascot-persona-profile">
              {assignedMascot.master_image_url ? (
                <img src={assignedMascot.master_image_url} alt={assignedMascot.name} className="mascot-persona-avatar" />
              ) : (
                <div className="mascot-persona-placeholder">
                  <Smiley size={36} style={{ color: assignedMascot.color_theme || "var(--accent)" }} />
                </div>
              )}

              <div className="mascot-persona-details">
                <div className="mascot-persona-title-row">
                  <h3 className="mascot-persona-name">{assignedMascot.name}</h3>
                  <span className="action-ready-badge">
                    <Sparkle size={12} weight="fill" />
                    <span>{t("channelDetail.posesReadyBadge", { count: readyStatesCount })}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="mascot-stage-specs">
              <div className="stage-spec-item">
                <span className="stage-spec-label">{t("channelDetail.stageAnchorLabel")}</span>
                <strong className="stage-spec-value">
                  {`16:9 ${p169.position === "bottom_left" ? "BL" : "BR"} · 9:16 ${p916.position === "bottom_left" ? "BL" : "BR"}`}
                </strong>
              </div>

              <div className="stage-spec-item">
                <span className="stage-spec-label">{t("channelDetail.scaleLabel", { scale: (p169.scale || 1.0).toFixed(2) })}</span>
                <strong className="stage-spec-value">
                  {`16:9 ${Math.round(p169.scale * 100)}% · 9:16 ${Math.round(p916.scale * 100)}%`}
                </strong>
              </div>

              <div className="stage-spec-item">
                <span className="stage-spec-label">{t("channelDetail.activeScenesLabel")}</span>
                <strong className="stage-spec-value">{activeScenes.join(" · ") || "None"}</strong>
              </div>
            </div>

            <div className="mascot-stage-action">
              <button
                type="button"
                className="primary-button stage-studio-launch-btn"
                onClick={onOpenStageStudio}
                disabled={changingMascot}
              >
                {changingMascot ? <CircleNotch className="spin" size={16} /> : <MonitorPlay size={16} />}
                <span>{t("channelDetail.openStageStudioBtn")}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mascot-empty-state">
            <div className="mascot-empty-info">
              <div className="mascot-empty-icon-wrap">
                <Smiley size={28} />
              </div>
              <div>
                <strong>{t("channelDetail.noMascotTitle")}</strong>
              </div>
            </div>

            <div className="mascot-empty-actions">
              <button
                type="button"
                className="quiet-button primary"
                onClick={onOpenStageStudio}
                disabled={changingMascot || mascotsList.length === 0}
              >
                <MonitorPlay size={15} />
                <span>{t("channelDetail.openStageStudioBtn")}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
