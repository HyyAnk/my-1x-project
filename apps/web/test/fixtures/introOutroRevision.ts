import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { IntroOutroScriptRevisionSchema } from "@studio/shared";
import { ScriptRevisionActions } from "../../src/features/channel/components/introOutroScriptStudio/ScriptRevisionActions";
import "../../src/styles.css";

const revision = IntroOutroScriptRevisionSchema.parse({
  schema_version: 1,
  revision_id: "revision",
  project_id: "project",
  channel_id: "channel",
  style_preset_id: "preset",
  clip_kind: "intro",
  revision_number: 1,
  origin: "generated",
  template_version: "intro-outro-script-v5",
  requested_model: "gemini-flash",
  effective_model: null,
  context_fingerprint: "a".repeat(64),
  created_at: "2026-09-25T00:00:00.000Z",
  seed_selection: { randomization_seed: "seed", selected_seed_ids: [], locked_dimensions: [], algorithm_version: "1" },
  seed_snapshot: [],
  validation_issues: [],
  warning_acknowledgements: [],
  references: [{ role: "mascot_subject", asset_id: "asset", url: "/reference.png", sha256: "a".repeat(64), mime_type: "image/png" }],
  content: {
    production: { clip_kind: "intro", language: "English", aspect_ratio: "16:9", target_duration_seconds: 8 },
    identity: { profile_id: "identity", mascot_id: "mascot", mascot_style_id: "style", required_feature_ids: [] },
    style: { description: "Flat vector", palette: [], staging: "Center", motion_language: "Restrained" },
    timeline: ["entrance", "brand_interaction", "handoff"].map((role, index) => ({
      beat: index + 1,
      role,
      start_seconds: [0, 2.56, 5.76][index],
      end_seconds: [2.56, 5.76, 8][index],
      action: "Hold a readable pose",
      capability_ids: [],
      props: [],
      visible_feature_ids: [],
    })),
    voiceover: { enabled: false, lines: [] },
    audio: { music_direction: "Light cue", events: [] },
    camera: [{ start_seconds: 0, end_seconds: 8, framing: "Wide", movement: "Static" }],
    consistency: { preserve_feature_ids: [], allowed_visible_text: [], restrictions: [] },
  },
});

function Preview() {
  const [selected, setSelected] = useState(false);
  return createElement(
    "main",
    { className: "intro-outro-script-studio", style: { margin: 16, padding: 16 } },
    createElement("h1", null, "Script revision"),
    createElement(ScriptRevisionActions, {
      revision,
      selectedForUpload: selected,
      busy: null,
      onApprove: async () => setSelected(true),
      nextActionLabel: "Continue to upload",
      onNextAction: () => undefined,
    }),
  );
}

createRoot(document.getElementById("root")!).render(createElement(Preview));
