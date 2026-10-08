import { FilmSlate } from "@phosphor-icons/react";

export type BookendPlacement = "intro" | "outro";

export type BookendToggleButtonsProps = {
  introEnabled: boolean;
  outroEnabled: boolean;
  busy: string | null;
  disabled?: boolean;
  onToggle: (placement: BookendPlacement, enabled: boolean) => void;
};

type BookendToggleProps = {
  label: string;
  enabled: boolean;
  disabled: boolean;
  onClick: () => void;
};

function BookendToggle({ label, enabled, disabled, onClick }: BookendToggleProps) {
  return (
    <button
      type="button"
      className={`fast-render-toggle-btn compact ${enabled ? "is-active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={enabled ? `${label} clip will be included in the rendered video` : `${label} clip will be skipped when rendering`}
      aria-pressed={enabled}
      aria-label={`Toggle ${label}`}
    >
      <FilmSlate size={13} weight={enabled ? "fill" : "regular"} />
      <span>
        {label}: {enabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}

export function BookendToggleButtons({ introEnabled, outroEnabled, busy, disabled = false, onToggle }: BookendToggleButtonsProps) {
  return (
    <>
      <BookendToggle
        label="Intro"
        enabled={introEnabled}
        disabled={disabled || busy === "intro-enabled"}
        onClick={() => onToggle("intro", !introEnabled)}
      />
      <BookendToggle
        label="Outro"
        enabled={outroEnabled}
        disabled={disabled || busy === "outro-enabled"}
        onClick={() => onToggle("outro", !outroEnabled)}
      />
    </>
  );
}
