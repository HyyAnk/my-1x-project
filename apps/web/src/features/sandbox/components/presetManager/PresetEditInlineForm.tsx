import { Check } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";

export interface PresetEditInlineFormProps {
  name: string;
  description: string;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function PresetEditInlineForm({
  name,
  description,
  onChangeName,
  onChangeDescription,
  onSave,
  onCancel,
}: PresetEditInlineFormProps) {
  const { t } = useTranslation();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <input
        type="text"
        value={name}
        onChange={(e) => onChangeName(e.target.value)}
        className="text-input"
        style={{ height: "32px", fontSize: "13px", fontWeight: 700 }}
        placeholder={t("visualSandbox.presetNameLabel")}
        autoFocus
      />
      <input
        type="text"
        value={description}
        onChange={(e) => onChangeDescription(e.target.value)}
        className="text-input"
        style={{ height: "28px", fontSize: "12px" }}
        placeholder={t("visualSandbox.descriptionPlaceholder")}
      />
      <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
        <button
          type="button"
          className="primary-button compact"
          onClick={onSave}
          disabled={!name.trim()}
          style={{ height: "28px", fontSize: "11px", padding: "0 10px" }}
        >
          <Check size={12} weight="bold" />
          <span>{t("common.save")}</span>
        </button>
        <button
          type="button"
          className="quiet-button compact"
          onClick={onCancel}
          style={{ height: "28px", fontSize: "11px", padding: "0 10px" }}
        >
          <span>{t("common.cancel")}</span>
        </button>
      </div>
    </div>
  );
}
