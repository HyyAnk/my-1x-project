import { useEffect, useState } from "react";
import { MascotCapabilityIdSchema, type MascotFeature, type MascotStyleIdentityProfile } from "@studio/shared";
import { Plus, Trash } from "@phosphor-icons/react";

type Props = {
  profile: MascotStyleIdentityProfile;
  saving: boolean;
  onSave: (profile: MascotStyleIdentityProfile) => Promise<void>;
  onCancel: () => void;
};

const lines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

function emptyFeature(index: number): MascotFeature {
  return {
    id: `feature_${index + 1}`,
    description: "Describe the visible feature",
    body_anchor: "visible body region",
    material: "unknown",
    rigidity: "unknown",
    importance: "supporting",
    visibility_rule: "Preserve when visible in the selected framing",
  };
}

export function MascotIdentityReview({ profile, saving, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(profile);
  useEffect(() => setDraft(profile), [profile]);

  const updateFeature = (index: number, patch: Partial<MascotFeature>) => {
    setDraft((current) => ({
      ...current,
      features: current.features.map((feature, featureIndex) => (featureIndex === index ? { ...feature, ...patch } : feature)),
    }));
  };

  return (
    <section className="script-identity-review" aria-labelledby="identity-review-title">
      <div className="script-section-heading">
        <h4 id="identity-review-title">Review mascot identity</h4>
        <span>{draft.features.length} features</span>
      </div>

      <label className="script-field">
        <span>Identity summary</span>
        <textarea
          value={draft.summary}
          onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
          rows={3}
          disabled={saving}
        />
      </label>

      <div className="script-two-column">
        <label className="script-field">
          <span>Visible morphology</span>
          <textarea
            value={draft.morphology.join("\n")}
            onChange={(event) => setDraft({ ...draft, morphology: lines(event.target.value) })}
            rows={4}
            disabled={saving}
          />
        </label>
        <label className="script-field">
          <span>Motion constraints</span>
          <textarea
            value={draft.motion_constraints.join("\n")}
            onChange={(event) => setDraft({ ...draft, motion_constraints: lines(event.target.value) })}
            rows={4}
            disabled={saving}
          />
        </label>
      </div>

      <label className="script-field">
        <span>Style description</span>
        <textarea
          value={draft.style_description}
          onChange={(event) => setDraft({ ...draft, style_description: event.target.value })}
          rows={2}
          disabled={saving}
        />
      </label>

      <div className="script-capability-grid">
        {MascotCapabilityIdSchema.options.map((capability) => (
          <label key={capability} className="script-field">
            <span>{capability.replaceAll("_", " ")}</span>
            <select
              value={draft.capabilities[capability] ?? "unknown"}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  capabilities: {
                    ...draft.capabilities,
                    [capability]: event.target.value as "supported" | "unsupported" | "unknown",
                  },
                })
              }
              disabled={saving}
            >
              <option value="unknown">Unknown</option>
              <option value="supported">Supported</option>
              <option value="unsupported">Unsupported</option>
            </select>
          </label>
        ))}
      </div>

      <div className="script-feature-list">
        {draft.features.map((feature, index) => (
          <div className="script-feature-row" key={`${feature.id}-${index}`}>
            <input
              aria-label={`Feature ${index + 1} ID`}
              value={feature.id}
              onChange={(event) => updateFeature(index, { id: event.target.value })}
              disabled={saving}
            />
            <input
              aria-label={`Feature ${index + 1} description`}
              value={feature.description}
              onChange={(event) => updateFeature(index, { description: event.target.value })}
              disabled={saving}
            />
            <select
              aria-label={`Feature ${index + 1} rigidity`}
              value={feature.rigidity}
              onChange={(event) => updateFeature(index, { rigidity: event.target.value as MascotFeature["rigidity"] })}
              disabled={saving}
            >
              <option value="unknown">Unknown</option>
              <option value="rigid">Rigid</option>
              <option value="flexible">Flexible</option>
            </select>
            <select
              aria-label={`Feature ${index + 1} importance`}
              value={feature.importance}
              onChange={(event) => updateFeature(index, { importance: event.target.value as MascotFeature["importance"] })}
              disabled={saving}
            >
              <option value="signature">Signature</option>
              <option value="important">Important</option>
              <option value="supporting">Supporting</option>
            </select>
            <button
              type="button"
              className="icon-button danger"
              aria-label={`Remove feature ${feature.id}`}
              onClick={() => setDraft({ ...draft, features: draft.features.filter((_, itemIndex) => itemIndex !== index) })}
              disabled={saving}
            >
              <Trash size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="script-inline-actions">
        <button
          type="button"
          className="quiet-button"
          onClick={() => setDraft({ ...draft, features: [...draft.features, emptyFeature(draft.features.length)] })}
          disabled={saving || draft.features.length >= 40}
        >
          <Plus size={15} /> Add feature
        </button>
        <span className="script-action-spacer" />
        <button type="button" className="quiet-button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => void onSave(draft).catch(() => undefined)}
          disabled={saving || !draft.summary.trim()}
        >
          {saving ? "Saving..." : "Approve identity"}
        </button>
      </div>
    </section>
  );
}
