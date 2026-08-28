import {
  CaretDown,
  CircleNotch,
  FileText,
  FloppyDisk,
  PencilSimple,
  Smiley,
  X,
} from "@phosphor-icons/react";
import {
  getCountryFlag,
  getCountryName,
  getLanguageDisplay,
  type Channel,
  type ChannelMascotConfig,
  type MascotProfile,
  type Task,
} from "@studio/shared";
import { formatDate } from "../../../lib/utils";
import { StatusLine } from "../../../components/AppChrome";
import { TaskProgressPanel } from "../../../components/TaskProgressPanel";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import { CountryFlag } from "../../../components/CountryFlag";
import { VisualStylesMenu } from "./VisualStylesMenu";
import { ThinkingBarStyleMenu } from "./ThinkingBarStyleMenu";

type ChannelDnaTabProps = {
  channel: Channel;
  dna: { content: string; path: string; modified_at: string } | null;
  dnaDraft: string;
  setDnaDraft: (draft: string) => void;
  editingDna: boolean;
  setEditingDna: (editing: boolean) => void;
  showDna: boolean;
  setShowDna: React.Dispatch<React.SetStateAction<boolean>>;
  busy: string | null;
  dnaTask: Task | null;
  topicClock: number;
  totalEpisodes: number;
  mascotsList: MascotProfile[];
  changingMascot: boolean;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
  onSaveDna: () => Promise<void>;
  onMascotChange: (mascotId: string | null) => Promise<void>;
  onMascotConfigUpdate: (updates: Partial<ChannelMascotConfig>) => Promise<void>;
};

export function ChannelDnaTab({
  channel,
  dna,
  dnaDraft,
  setDnaDraft,
  editingDna,
  setEditingDna,
  showDna,
  setShowDna,
  busy,
  dnaTask,
  topicClock,
  totalEpisodes,
  mascotsList,
  changingMascot,
  onRefresh,
  onNotice,
  onSaveDna,
  onMascotChange,
  onMascotConfigUpdate,
}: ChannelDnaTabProps) {
  const { t } = useTranslation();

  return (
    <div className="detail-grid" style={{ marginTop: "12px" }}>
      <section className={`panel dna-panel ${showDna ? "is-open" : ""}`}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Identity Blueprint</p>
            <h2>Channel DNA</h2>
          </div>
          <div className="panel-actions">
            {channel.engine === "quiz" ? (
              <>
                <VisualStylesMenu channel={channel} onRefresh={onRefresh} onNotice={onNotice} />
                <ThinkingBarStyleMenu channel={channel} onRefresh={onRefresh} onNotice={onNotice} />
              </>
            ) : null}
            {editingDna ? (
              <>
                <button
                  className="quiet-button compact"
                  onClick={() => {
                    setEditingDna(false);
                    setDnaDraft(dna?.content ?? "");
                  }}
                >
                  <X size={15} />
                  <span>Cancel</span>
                </button>
                <button
                  className="primary-button compact"
                  disabled={busy === "dna"}
                  onClick={() => void onSaveDna()}
                >
                  {busy === "dna" ? <CircleNotch className="spin" size={15} /> : <FloppyDisk size={15} />}
                  <span>Save</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className="quiet-button compact dna-toggle"
                  aria-expanded={showDna}
                  aria-controls="channel-dna-content"
                  onClick={() => setShowDna((current) => !current)}
                >
                  <span>{showDna ? "Hide DNA" : "View DNA"}</span>
                  <CaretDown size={14} />
                </button>
                {showDna ? (
                  <button className="quiet-button compact" onClick={() => setEditingDna(true)}>
                    <PencilSimple size={15} />
                    <span>Edit DNA</span>
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
        {dnaTask ? (
          <TaskProgressPanel
            task={dnaTask}
            title="Channel DNA"
            activeLabel="Generating channel DNA"
            completionLabel="Channel DNA ready"
            now={topicClock}
            compact
          />
        ) : null}
        {showDna ? (
          <div id="channel-dna-content" className="dna-content">
            {editingDna ? (
              <textarea
                className="markdown-editor"
                value={dnaDraft}
                onChange={(event) => setDnaDraft(event.target.value)}
                spellCheck={false}
              />
            ) : (
              <pre className="markdown-preview">{dna?.content || "Loading DNA..."}</pre>
            )}
            <div className="file-meta">
              <FileText size={14} />
              <span>{dna?.path ?? `channels/${channel.slug}/channel_dna.md`}</span>
              <span>{dna?.modified_at ? `Updated ${formatDate(dna.modified_at)}` : ""}</span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel status-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Metadata</p>
            <h2>{t("channelDetail.productionStatus")}</h2>
          </div>
        </div>
        <div className="status-stack">
          <StatusLine label="Engine" value="Quiz Engine" />
          <StatusLine label="Channel Status" value={channel.status} />
          <StatusLine label="Total Episodes" value={String(totalEpisodes)} />
          <StatusLine label="Language" value={getLanguageDisplay(channel.language || "English")} />
          <StatusLine
            label="Target Country"
            value={
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <CountryFlag code={channel.country || channel.market} size={15} />
                <span>{getCountryName(channel.country || channel.market)}</span>
              </span>
            }
          />
        </div>
      </section>

      {/* Mascot & Video Host Persona Branding Panel */}
      <section className="panel mascot-channel-branding-panel" style={{ gridColumn: "1 / -1" }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Visual Persona & Host</p>
            <h2>Mascot Video Host</h2>
          </div>
          <div className="panel-actions">
            <select
              value={channel.mascot_id || ""}
              disabled={changingMascot}
              style={{
                fontSize: "12px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "var(--surface-hover)",
                border: "1px solid var(--line)",
              }}
              onChange={(e) => void onMascotChange(e.target.value || null)}
              title={t("channelDetail.mascotSelectTitle")}
            >
              <option value="">{t("channelDetail.noMascotOption")}</option>
              {mascotsList.map((m) => (
                <option key={m.id} value={m.id}>
                  🎨 {m.name} ({t("mascots.posesBadge", { count: Object.values(m.actions).filter((a) => a?.sprite_url).length })})
                </option>
              ))}
            </select>
          </div>
        </div>

        {channel.mascot_id ? (() => {
          const assignedMascot = mascotsList.find((m) => m.id === channel.mascot_id);
          const cfg = channel.mascot_config || { enabled: true, position: "bottom_left", scale: 1.0 };

          return (
            <div className="mascot-branding-content">
              <div className="mascot-branding-preview">
                {assignedMascot?.master_image_url ? (
                  <img src={assignedMascot.master_image_url} alt={assignedMascot.name} className="mascot-branding-img" />
                ) : (
                  <div className="mascot-branding-placeholder">
                    <Smiley size={48} style={{ color: assignedMascot?.color_theme || "var(--accent)" }} />
                  </div>
                )}
                <div className="mascot-branding-info">
                  <h3>{assignedMascot?.name || "Mascot"}</h3>
                  <p>{assignedMascot?.description || assignedMascot?.master_prompt || t("channelDetail.mascotDefaultDesc")}</p>
                  <span className="action-ready-badge" style={{ display: "inline-block", marginTop: "4px" }}>
                    {t("channelDetail.posesReadyBadge", {
                      count: Object.values(assignedMascot?.actions || {}).filter((a) => a?.sprite_url).length,
                    })}
                  </span>
                </div>
              </div>

              <div className="mascot-branding-controls">
                <div className="form-group">
                  <label style={{ marginBottom: "6px", display: "block" }}>{t("mascots.positionLabel") || "Vị trí hiển thị"}</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <button
                      type="button"
                      className={`quiet-button ${cfg.position === "bottom_left" ? "primary" : ""}`}
                      onClick={() => void onMascotConfigUpdate({ position: "bottom_left" })}
                      disabled={changingMascot}
                      style={{ padding: "4px 8px", fontSize: "12px" }}
                    >
                      👈 {t("mascots.posBottomLeft") || "Góc trái"}
                    </button>
                    <button
                      type="button"
                      className={`quiet-button ${cfg.position === "bottom_right" ? "primary" : ""}`}
                      onClick={() => void onMascotConfigUpdate({ position: "bottom_right" })}
                      disabled={changingMascot}
                      style={{ padding: "4px 8px", fontSize: "12px" }}
                    >
                      👉 {t("mascots.posBottomRight") || "Góc phải"}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "10px" }}>
                  <label style={{ marginBottom: "6px", display: "block" }}>{t("mascots.visibilityLabel") || "Hiển thị theo phân cảnh"}</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(cfg.show_in_intro)}
                        disabled={changingMascot}
                        onChange={(e) => void onMascotConfigUpdate({ show_in_intro: e.target.checked })}
                      />
                      <span>🎬 {t("mascots.showInIntro") || "Intro mở đầu (Mặc định: Tắt)"}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={cfg.show_in_question !== false}
                        disabled={changingMascot}
                        onChange={(e) => void onMascotConfigUpdate({ show_in_question: e.target.checked })}
                      />
                      <span>❓ {t("mascots.showInQuestion") || "Câu hỏi & Reveal đáp án"}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(cfg.show_in_outro)}
                        disabled={changingMascot}
                        onChange={(e) => void onMascotConfigUpdate({ show_in_outro: e.target.checked })}
                      />
                      <span>🏁 {t("mascots.showInOutro") || "Outro kết thúc (Mặc định: Tắt)"}</span>
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label>{t("channelDetail.scaleLabel", { scale: (cfg.scale || 1.0).toFixed(2) })}</label>
                    <span className="scale-value-badge" style={{ fontSize: "11px", padding: "1px 6px" }}>{Math.round((cfg.scale || 1.0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={1.8}
                    step={0.01}
                    value={cfg.scale || 1.0}
                    disabled={changingMascot}
                    onChange={(e) => void onMascotConfigUpdate({ scale: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group" style={{ marginTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ margin: 0 }}>Offset X / Y (1920x1080 px)</label>
                    <span style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 600 }}>
                      X: {cfg.offset_x || 0}px | Y: {cfg.offset_y || 0}px
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <small style={{ color: "var(--muted)", fontSize: "11px" }}>X (Ngang):</small>
                      <input
                        type="range"
                        min={-300}
                        max={300}
                        value={cfg.offset_x || 0}
                        disabled={changingMascot}
                        onChange={(e) => void onMascotConfigUpdate({ offset_x: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <small style={{ color: "var(--muted)", fontSize: "11px" }}>Y (Dọc):</small>
                      <input
                        type="range"
                        min={-300}
                        max={300}
                        value={cfg.offset_y || 0}
                        disabled={changingMascot}
                        onChange={(e) => void onMascotConfigUpdate({ offset_y: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })() : (
          <div style={{ padding: "16px", color: "var(--muted)", fontSize: "13px" }}>
            {t("channelDetail.noMascotEmptyText")}
          </div>
        )}
      </section>
    </div>
  );
}
