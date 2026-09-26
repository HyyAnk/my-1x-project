import { useEffect, useMemo, useState } from "react";
import { ArrowsClockwise, Lock, LockOpen, Sparkle } from "@phosphor-icons/react";
import type { CreativeSeed, CreativeSeedDimension, IntroOutroClipKind, IntroOutroScriptProject } from "@studio/shared";
import type { GenerateScriptClipInput } from "../../../../api/introOutroScriptApi";

type Props = {
  seeds: CreativeSeed[];
  project: IntroOutroScriptProject;
  disabled: boolean;
  onGenerate: (clips: GenerateScriptClipInput[]) => Promise<void>;
  onOpenBatchModal?: () => void;
};

const newRandomSeed = () =>
  typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function ScriptSeedControls({ seeds, project, disabled, onGenerate, onOpenBatchModal }: Props) {
  const [included, setIncluded] = useState<Record<IntroOutroClipKind, boolean>>({ intro: true, outro: true });
  const [durations, setDurations] = useState<Record<IntroOutroClipKind, number>>({ intro: 8, outro: 8 });
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState<Set<CreativeSeedDimension>>(new Set());
  const [logoMode, setLogoMode] = useState<"supplied_reference" | "post_overlay" | "none">("supplied_reference");
  const [randomizationSeed, setRandomizationSeed] = useState(newRandomSeed);
  const groups = useMemo(() => {
    const map = new Map<CreativeSeedDimension, CreativeSeed[]>();
    for (const seed of seeds) map.set(seed.dimension, [...(map.get(seed.dimension) ?? []), seed]);
    return [...map.entries()];
  }, [seeds]);

  useEffect(() => {
    const drafts = [project.drafts.intro, project.drafts.outro];
    const byId = new Map(seeds.map((seed) => [seed.id, seed]));
    const restored: Record<string, string> = {};
    for (const draft of drafts) {
      for (const seedId of draft.seed_selection?.selected_seed_ids ?? []) {
        const seed = byId.get(seedId);
        if (seed) restored[seed.dimension] = seed.id;
      }
    }
    setIncluded({ intro: true, outro: true });
    setDurations({
      intro: project.drafts.intro.target_duration_seconds,
      outro: project.drafts.outro.target_duration_seconds,
    });
    setSelected(restored);
    setLocked(new Set(drafts.flatMap((draft) => draft.seed_selection?.locked_dimensions ?? [])));
    setRandomizationSeed(
      project.drafts.intro.seed_selection?.randomization_seed ?? project.drafts.outro.seed_selection?.randomization_seed ?? newRandomSeed(),
    );
  }, [project.project_id, project.version, project.drafts, seeds]);

  useEffect(() => {
    setSelected((current) => {
      const next = { ...current };
      for (const [dimension, options] of groups) {
        if (!options.some((seed) => seed.id === next[dimension])) next[dimension] = options[0]?.id ?? "";
      }
      return next;
    });
  }, [groups]);

  const randomize = () => {
    setSelected((current) => {
      const next = { ...current };
      for (const [dimension, options] of groups) {
        if (!locked.has(dimension) && options.length) {
          next[dimension] = options[Math.floor(Math.random() * options.length)].id;
        }
      }
      return next;
    });
    setRandomizationSeed(newRandomSeed());
  };

  const generate = async () => {
    const clips = (["intro", "outro"] as const)
      .filter((kind) => included[kind])
      .map((kind) => ({
        clip_kind: kind,
        duration_seconds: durations[kind],
        randomization_seed: randomizationSeed,
        logo_mode: logoMode,
        selected_seed_ids: groups
          .filter(([, options]) => options[0]?.clip_kind === kind)
          .map(([dimension]) => selected[dimension])
          .filter(Boolean),
        locked_dimensions: [...locked].filter((dimension) => dimension.startsWith(kind)),
      }));
    await onGenerate(clips);
  };

  return (
    <div className="script-seed-controls">
      <div className="script-clip-options">
        {(["intro", "outro"] as const).map((kind) => (
          <div className="script-clip-option" key={kind}>
            <label>
              <input
                type="checkbox"
                checked={included[kind]}
                onChange={(event) => setIncluded({ ...included, [kind]: event.target.checked })}
                disabled={disabled}
              />
              <strong>{kind === "intro" ? "Intro" : "Outro"}</strong>
            </label>
            <label>
              <span>Duration</span>
              <select
                value={durations[kind]}
                onChange={(event) => setDurations({ ...durations, [kind]: Number(event.target.value) })}
                disabled={disabled || !included[kind]}
              >
                <option value={6}>6 seconds</option>
                <option value={7}>7 seconds</option>
                <option value={8}>8 seconds</option>
                <option value={9}>9 seconds</option>
                <option value={10}>10 seconds</option>
              </select>
            </label>
          </div>
        ))}
        <div className="script-clip-option">
          <label>
            <span>Logo presentation</span>
            <select
              value={logoMode}
              onChange={(event) => setLogoMode(event.target.value as "supplied_reference" | "post_overlay" | "none")}
              disabled={disabled}
            >
              <option value="supplied_reference">In-Scene 3D Reveal</option>
              <option value="post_overlay">Editor Overlay</option>
              <option value="none">No Logo</option>
            </select>
          </label>
        </div>
      </div>

      <div className="script-section-heading">
        <h4>Creative direction</h4>
        <button type="button" className="quiet-button" onClick={randomize} disabled={disabled}>
          <ArrowsClockwise size={15} /> Randomize
        </button>
      </div>
      <div className="script-seed-grid">
        {groups.map(([dimension, options]) => (
          <div className="script-seed-control" key={dimension}>
            <label>
              <span>{dimension.replaceAll("_", " ")}</span>
              <select
                value={selected[dimension] ?? ""}
                onChange={(event) => setSelected({ ...selected, [dimension]: event.target.value })}
                disabled={disabled || !included[options[0]?.clip_kind ?? "intro"]}
              >
                {options.map((seed) => (
                  <option value={seed.id} key={seed.id}>
                    {seed.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="icon-button"
              aria-label={locked.has(dimension) ? `Unlock ${dimension}` : `Lock ${dimension}`}
              onClick={() =>
                setLocked((current) => {
                  const next = new Set(current);
                  if (next.has(dimension)) next.delete(dimension);
                  else next.add(dimension);
                  return next;
                })
              }
              disabled={disabled}
            >
              {locked.has(dimension) ? <Lock size={15} /> : <LockOpen size={15} />}
            </button>
          </div>
        ))}
      </div>
      <div className="script-generate-action-group">
        <button
          type="button"
          className="primary-button script-generate-button"
          onClick={() => void generate().catch(() => undefined)}
          disabled={disabled || (!included.intro && !included.outro)}
        >
          Generate scripts
        </button>
        {onOpenBatchModal ? (
          <button
            type="button"
            className="quiet-button batch-trigger-button"
            onClick={onOpenBatchModal}
            disabled={disabled}
            title="Generate multiple script pairs concurrently"
          >
            <Sparkle size={15} weight="fill" />
            <span>Batch Generate</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
