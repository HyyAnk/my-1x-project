import { useState } from "react";
import { CircleNotch, FileText, Plus, X } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { api } from "../../../api";
import type { ChannelGroupId } from "../../../components/ChannelList";
import { useTranslation } from "../../../i18n";

type CreateChannelForm = {
  name: string;
  description: string;
  target_audience: string;
  language: string;
  market: string;
  group_id: ChannelGroupId;
  dna_mode: "example" | "ai" | "upload";
  dna_content: string;
};

export function CreateChannelModal({
  initialGroupId = "quiz",
  onClose,
  onCreated,
  onError,
}: {
  initialGroupId?: ChannelGroupId;
  onClose: () => void;
  onCreated: (channelId: string, message: string, task: Task | null) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateChannelForm>({
    name: "",
    description: "",
    target_audience: "Children and families",
    language: "English",
    market: "Global",
    group_id: initialGroupId,
    dna_mode: "example",
    dna_content: "",
  });
  const [dnaFileName, setDnaFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleDnaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".md")) {
      event.target.value = "";
      onError(new Error("Choose a Markdown file (.md) for channel DNA."));
      return;
    }
    try {
      const content = await file.text();
      if (!content.trim()) throw new Error("The selected channel DNA file is empty.");
      setForm((current) => ({ ...current, dna_mode: "upload", dna_content: content }));
      setDnaFileName(file.name);
    } catch (error) {
      event.target.value = "";
      onError(error);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.dna_mode === "upload" && !form.dna_content.trim()) {
      onError(new Error("Choose a channel_dna.md file before creating the channel."));
      return;
    }
    setBusy(true);
    try {
      const result = await api.createChannel(form);
      const message = result.task
        ? "Channel created and DNA generation queued"
        : form.dna_mode === "upload"
        ? "Channel created from uploaded DNA"
        : "Channel created with example DNA";
      await onCreated(result.channel.channel_id, message, result.task);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={(event) => void submit(event)}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t("channels.quizChannels")}</p>
            <h2>{t("channels.createChannelTitle")}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <label>
          {t("channels.channelNameLabel")}
          <input
            required
            autoFocus
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="World Wonder Quiz"
          />
        </label>
        <label>
          {t("channels.descriptionLabel")}
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="What should children discover?"
          />
        </label>
        <div className="form-grid">
          <label>
            {t("channels.targetAudienceLabel")}
            <input
              value={form.target_audience}
              onChange={(event) => setForm((current) => ({ ...current, target_audience: event.target.value }))}
              placeholder="Children and families"
            />
          </label>
          <label>
            Market
            <input
              value={form.market}
              onChange={(event) => setForm((current) => ({ ...current, market: event.target.value }))}
              placeholder="Global"
            />
          </label>
        </div>
        <div className="dna-choice">
          <span className="field-label">{t("channels.startingDna")}</span>
          <div className="choice-row dna-choice-row">
            {(["example", "ai", "upload"] as const).map((value) => (
              <button
                type="button"
                key={value}
                className={`choice ${form.dna_mode === value ? "is-selected" : ""}`}
                onClick={() => setForm((current) => ({ ...current, dna_mode: value }))}
              >
                <span className="choice-radio" />
                {value === "example" ? "Use Quiz DNA" : value === "ai" ? "Create with AI" : t("channels.uploadDna")}
              </button>
            ))}
          </div>
          {form.dna_mode === "upload" ? (
            <div className="dna-upload">
              <label className="dna-upload-button">
                <FileText size={15} />
                {dnaFileName || "Choose channel_dna.md"}
                <input
                  aria-label="Channel DNA file"
                  type="file"
                  accept=".md,text/markdown"
                  onChange={(event) => void handleDnaUpload(event)}
                />
              </label>
              {dnaFileName ? (
                <span className="dna-file-name">{dnaFileName}</span>
              ) : (
                <span className="dna-upload-hint">Markdown only</span>
              )}
            </div>
          ) : null}
        </div>
        <div className="modal-actions">
          <button type="button" className="quiet-button" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="primary-button"
            disabled={busy || (form.dna_mode === "upload" && !form.dna_content.trim())}
          >
            {busy ? <CircleNotch className="spin" size={16} /> : <Plus size={16} />}
            {t("channels.createFirstChannel")}
          </button>
        </div>
      </form>
    </div>
  );
}
