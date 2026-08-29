import { Sparkle, TerminalWindow } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";

export type EngineToggleGroupProps = {
  activeEngine: "codex" | "antigravity";
  onEngineToggle: (engine: "codex" | "antigravity") => Promise<void> | void;
};

export function EngineToggleGroup({ activeEngine, onEngineToggle }: EngineToggleGroupProps) {
  const { t } = useTranslation();
  return (
    <div className="engine-toggle-group" role="group" aria-label={t("topbar.engineSelection")}>
      <button
        type="button"
        className={`engine-toggle-btn ${activeEngine === "codex" ? "is-active" : ""}`}
        onClick={() => void onEngineToggle("codex")}
        title="OpenAI Codex JSON-RPC Engine"
      >
        <TerminalWindow size={14} weight={activeEngine === "codex" ? "bold" : "regular"} />
        <span>{t("topbar.codexEngine")}</span>
      </button>
      <button
        type="button"
        className={`engine-toggle-btn ${activeEngine === "antigravity" ? "is-active" : ""}`}
        onClick={() => void onEngineToggle("antigravity")}
        title="Google Antigravity Engine"
      >
        <Sparkle size={14} weight={activeEngine === "antigravity" ? "bold" : "regular"} />
        <span>{t("topbar.antigravityEngine")}</span>
      </button>
    </div>
  );
}
