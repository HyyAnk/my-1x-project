import { useEffect, useState } from "react";
import { CreativeSeedDimensionSchema, type CreativeSeed, type CreativeSeedDimension } from "@studio/shared";
import { api } from "../../../../api";

type Props = {
  channelId: string;
  onChanged: () => Promise<void>;
};

const clipKind = (dimension: CreativeSeedDimension) => (dimension.startsWith("intro_") ? ("intro" as const) : ("outro" as const));

export function CustomSeedPanel({ channelId, onChanged }: Props) {
  const [seeds, setSeeds] = useState<CreativeSeed[]>([]);
  const [dimension, setDimension] = useState<CreativeSeedDimension>("intro_entrance");
  const [name, setName] = useState("");
  const [intent, setIntent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await api.listIntroOutroSeeds(channelId);
      setSeeds(response.seeds.filter((seed) => seed.origin === "custom"));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load custom seeds");
    }
  };

  useEffect(() => {
    void load();
  }, [channelId]);

  const createSeed = async () => {
    if (!name.trim() || !intent.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createIntroOutroSeed(channelId, {
        dimension,
        clip_kind: clipKind(dimension),
        name: name.trim(),
        narrative_intent: intent.trim(),
        required_capabilities: [],
        style_tags: [],
        allowed_props: [],
        allowed_text: [],
        forbidden_seed_ids: [],
        complexity: "low",
        selection_weight: 1,
      });
      setName("");
      setIntent("");
      await Promise.all([load(), onChanged()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create custom seed");
    } finally {
      setBusy(false);
    }
  };

  const archiveSeed = async (seed: CreativeSeed) => {
    setBusy(true);
    setError(null);
    try {
      await api.updateIntroOutroSeed(channelId, seed.id, {
        expected_revision: seed.revision,
        status: "archived",
      });
      await Promise.all([load(), onChanged()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to archive custom seed");
    } finally {
      setBusy(false);
    }
  };

  const reviseSeed = async (seed: CreativeSeed) => {
    const revisedIntent = window.prompt("Narrative intent", seed.narrative_intent)?.trim();
    if (!revisedIntent || revisedIntent === seed.narrative_intent) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateIntroOutroSeed(channelId, seed.id, {
        expected_revision: seed.revision,
        narrative_intent: revisedIntent,
      });
      await Promise.all([load(), onChanged()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to revise custom seed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="script-seed-manager">
      <summary>Custom seeds</summary>
      <div className="script-seed-form">
        <label className="script-field">
          <span>Dimension</span>
          <select value={dimension} onChange={(event) => setDimension(event.target.value as CreativeSeedDimension)} disabled={busy}>
            {CreativeSeedDimensionSchema.options.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="script-field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} disabled={busy} />
        </label>
        <label className="script-field script-seed-intent">
          <span>Narrative intent</span>
          <input value={intent} onChange={(event) => setIntent(event.target.value)} maxLength={600} disabled={busy} />
        </label>
        <button type="button" className="quiet-button" onClick={() => void createSeed()} disabled={busy || !name.trim() || !intent.trim()}>
          Add seed
        </button>
      </div>
      {busy ? (
        <div className="script-seed-progress" aria-live="polite">
          Updating seeds...
        </div>
      ) : null}
      {error ? (
        <div className="script-seed-error" role="alert">
          {error}
        </div>
      ) : null}
      {seeds.length ? (
        <div className="script-custom-seed-list">
          {seeds.map((seed) => (
            <div key={seed.id}>
              <span>
                <strong>{seed.name}</strong> · {seed.dimension.replaceAll("_", " ")}
              </span>
              <span className="script-custom-seed-actions">
                <button type="button" className="quiet-button" onClick={() => void reviseSeed(seed)} disabled={busy}>
                  Revise
                </button>
                <button type="button" className="quiet-button" onClick={() => void archiveSeed(seed)} disabled={busy}>
                  Archive
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </details>
  );
}
