import { useState } from "react";
import { ArrowCounterClockwise, Check, CircleNotch, Copy, FileText, FloppyDisk, PencilSimple, Robot, X } from "@phosphor-icons/react";
import type { Channel, Task } from "@studio/shared";
import { api } from "../../../api";
import { formatDate } from "../../../lib/utils";
import { TaskProgressPanel } from "../../../components/TaskProgressPanel";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";

type ChannelDnaBlueprintSectionProps = {
  channel: Channel;
  dna: { content: string; path: string; modified_at: string } | null;
  dnaDraft: string;
  setDnaDraft: (draft: string) => void;
  editingDna: boolean;
  setEditingDna: (editing: boolean) => void;
  busy: string | null;
  dnaTask: Task | null;
  topicClock: number;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
  onSaveDna: () => Promise<void>;
  onTaskSubmitted?: (task: Task) => void;
};

export function ChannelDnaBlueprintSection({
  channel,
  dna,
  dnaDraft,
  setDnaDraft,
  editingDna,
  setEditingDna,
  busy,
  dnaTask,
  topicClock,
  onRefresh,
  onNotice,
  onSaveDna,
  onTaskSubmitted,
}: ChannelDnaBlueprintSectionProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopyDna = async () => {
    if (!dna?.content) return;
    try {
      await navigator.clipboard.writeText(dna.content);
      setCopied(true);
      onNotice({ tone: "good", message: t("channelDetail.dnaCopied") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotice({ tone: "bad", message: "Failed to copy DNA to clipboard" });
    }
  };

  const handleResetTemplate = async () => {
    if (!window.confirm(t("channelDetail.resetDnaConfirm"))) return;
    setResetting(true);
    try {
      const res = await api.resetDnaTemplate(channel.channel_id);
      setDnaDraft(res.content);
      setEditingDna(false);
      onNotice({ tone: "good", message: t("channelDetail.dnaResetSuccess") });
      await onRefresh();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to reset DNA" });
    } finally {
      setResetting(false);
    }
  };

  const handleRegenerateDna = async () => {
    if (!window.confirm(t("channelDetail.regenerateDnaConfirm"))) return;
    setRegenerating(true);
    try {
      const res = await api.generateDna(channel.channel_id);
      if (res.task && onTaskSubmitted) {
        onTaskSubmitted(res.task);
      }
      onNotice({ tone: "good", message: t("channelDetail.dnaGenerateStarted") });
      await onRefresh();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to trigger DNA generation" });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <section className="panel channel-blueprint-section">
      <div className="panel-heading">
        <div>
          <h2>{t("channelDetail.dnaBlueprintTitle")}</h2>
        </div>

        <div className="panel-actions blueprint-toolbar">
          {editingDna ? (
            <>
              <button
                type="button"
                className="quiet-button compact"
                onClick={() => {
                  setEditingDna(false);
                  setDnaDraft(dna?.content ?? "");
                }}
              >
                <X size={15} />
                <span>{t("channelDetail.cancelEdit")}</span>
              </button>

              <button
                type="button"
                className="primary-button compact"
                disabled={busy === "dna"}
                onClick={() => void onSaveDna()}
              >
                {busy === "dna" ? <CircleNotch className="spin" size={15} /> : <FloppyDisk size={15} />}
                <span>{t("channelDetail.saveDna")}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="quiet-button compact"
                onClick={() => void handleCopyDna()}
                title={t("channelDetail.copyDna")}
                disabled={!dna?.content}
              >
                {copied ? <Check size={15} style={{ color: "var(--green)" }} /> : <Copy size={15} />}
                <span>{copied ? "Copied!" : t("channelDetail.copyDna")}</span>
              </button>

              <button
                type="button"
                className="quiet-button compact"
                onClick={() => void handleResetTemplate()}
                title={t("channelDetail.resetDnaTemplate")}
                disabled={resetting}
              >
                {resetting ? <CircleNotch className="spin" size={15} /> : <ArrowCounterClockwise size={15} />}
                <span>{t("channelDetail.resetDnaTemplate")}</span>
              </button>

              <button
                type="button"
                className="quiet-button compact"
                onClick={() => void handleRegenerateDna()}
                title={t("channelDetail.regenerateDna")}
                disabled={regenerating}
              >
                {regenerating ? <CircleNotch className="spin" size={15} /> : <Robot size={15} />}
                <span>{t("channelDetail.regenerateDna")}</span>
              </button>

              <button
                type="button"
                className="primary-button compact"
                onClick={() => setEditingDna(true)}
              >
                <PencilSimple size={15} />
                <span>{t("channelDetail.editDna")}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {dnaTask ? (
        <TaskProgressPanel
          task={dnaTask}
          title="Channel DNA"
          activeLabel="Generating channel DNA with AI"
          completionLabel="Channel DNA ready"
          now={topicClock}
          compact
        />
      ) : null}

      <div className="blueprint-content-body">
        {editingDna ? (
          <textarea
            className="markdown-editor blueprint-editor"
            value={dnaDraft}
            onChange={(event) => setDnaDraft(event.target.value)}
            spellCheck={false}
            placeholder="# Channel DNA blueprint..."
          />
        ) : (
          <pre className="markdown-preview blueprint-preview">{dna?.content || "Loading DNA blueprint..."}</pre>
        )}

        <div className="file-meta blueprint-meta-footer">
          <div className="meta-left">
            <FileText size={14} />
            <span className="file-path">{dna?.path ?? `channels/${channel.slug}/channel_dna.md`}</span>
          </div>
          <div className="meta-right">
            <span>{dna?.modified_at ? `${t("channelDetail.lastUpdated")}: ${formatDate(dna.modified_at)}` : ""}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
