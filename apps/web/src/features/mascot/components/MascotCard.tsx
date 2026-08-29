import { DownloadSimple, Trash } from "@phosphor-icons/react";
import { QUIZ_IMAGE_STYLE_LABELS, type Channel, type MascotProfile } from "@studio/shared";
import { api } from "../../../api";
import { useTranslation } from "../../../i18n";

type MascotCardProps = {
  mascot: MascotProfile;
  channels: Channel[];
  onEdit: (mascot: MascotProfile) => void;
  onQuickAssign: (mascot: MascotProfile) => void;
  onDeleteRequest: (mascot: MascotProfile) => void;
};

export function MascotCard({ mascot, channels, onEdit, onQuickAssign, onDeleteRequest }: MascotCardProps) {
  const { t } = useTranslation();
  const assignedCount = mascot.assigned_channel_ids?.length || 0;
  const assignedNames =
    mascot.assigned_channel_ids?.map((cid) => channels.find((c) => c.channel_id === cid)?.display_name || cid).join(", ") || "";

  return (
    <article className="mascot-card">
      <div
        className="mascot-card-preview-box"
        data-nav-href="#/mascots?tab=generator"
        onClick={() => onEdit(mascot)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onEdit(mascot);
          }
        }}
      >
        {mascot.master_image_url ? (
          <img src={mascot.master_image_url} alt={mascot.name} className="mascot-card-img" />
        ) : (
          <div className="mascot-card-placeholder">
            <span>{t("mascots.noImagePlaceholder")}</span>
          </div>
        )}

        <div className="mascot-card-meta-top">
          <span className="mascot-style-pill">{QUIZ_IMAGE_STYLE_LABELS[mascot.visual_style] || mascot.visual_style}</span>

          <div className="mascot-card-quick-actions" onClick={(e) => e.stopPropagation()}>
            <a
              href={api.exportMascotUrl(mascot.id)}
              download={`mascot_${mascot.id}.zip`}
              className="mascot-quick-action-btn"
              title={t("mascots.exportZipTooltip")}
            >
              <DownloadSimple size={14} />
            </a>
            <button
              type="button"
              className="mascot-quick-action-btn is-danger"
              aria-label={t("mascots.deleteMascotAria", { name: mascot.name })}
              onClick={() => onDeleteRequest(mascot)}
              title={t("common.delete")}
            >
              <Trash size={14} />
            </button>
          </div>
        </div>

        {assignedCount > 0 ? (
          <div className="mascot-card-meta-bottom" title={assignedNames}>
            <span className="mascot-channel-badge">
              <span className="channel-badge-dot" />
              <span>{t("mascots.activeChannelsShort", { count: assignedCount })}</span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="mascot-card-content">
        <div className="mascot-card-header">
          <h3 onClick={() => onEdit(mascot)} title={mascot.name}>
            {mascot.name}
          </h3>
        </div>

        <div className="mascot-card-footer">
          <button type="button" className="quiet-button compact" onClick={() => onQuickAssign(mascot)}>
            <span>{t("mascots.quickAssignBtn")}</span>
          </button>
          <button type="button" className="primary-button compact" data-nav-href="#/mascots?tab=generator" onClick={() => onEdit(mascot)}>
            <span>{t("mascots.generatorBtn")}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
