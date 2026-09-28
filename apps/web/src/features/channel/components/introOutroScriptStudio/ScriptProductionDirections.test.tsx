import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { IntroOutroScriptContentSchema } from "@studio/shared";
import { ScriptProductionDirections } from "./ScriptProductionDirections";

afterEach(cleanup);

it("allows a zero final hold for creative scripts and preserves the legacy field minimum", () => {
  const content = IntroOutroScriptContentSchema.parse({
    production_policy: "creative-performance-v3",
    production: { clip_kind: "intro", language: "English", aspect_ratio: "16:9", target_duration_seconds: 8 },
    production_directions: {
      reference_mode: "character_reference",
      logo_mode: "none",
      voice_source: "none",
      logo_placement: "No logo",
      opening_state: "Opening",
      closing_state: "Ending",
      end_hold_seconds: 1,
    },
    identity: { profile_id: "p", mascot_id: "m", mascot_style_id: "s", required_feature_ids: [] },
    style: { description: "Reference style", staging: "Stage", motion_language: "Playful" },
    timeline: [0, 1, 2].map((index) => ({
      beat: index + 1,
      role: "group",
      start_seconds: index * 2,
      end_seconds: (index + 1) * 2,
      action: "Reaction",
    })),
    voiceover: { enabled: false, lines: [] },
    audio: {},
    camera: [{ start_seconds: 0, end_seconds: 8, framing: "Wide", movement: "Static" }],
    consistency: { preserve_feature_ids: [], restrictions: [] },
  });
  const onChange = vi.fn();
  const view = render(<ScriptProductionDirections content={content} disabled={false} onChange={onChange} />);
  const input = screen.getByRole("spinbutton", { name: "Final hold (seconds)" });
  expect(input.getAttribute("min")).toBe("0");
  expect(input.getAttribute("max")).toBeNull();
  fireEvent.change(input, { target: { value: "3" } });
  expect(onChange).toHaveBeenCalledWith({ ...content, production_directions: { ...content.production_directions, end_hold_seconds: 3 } });
  fireEvent.change(input, { target: { value: "0" } });
  expect(onChange).toHaveBeenCalledWith({ ...content, production_directions: { ...content.production_directions, end_hold_seconds: 0 } });
  view.rerender(
    <ScriptProductionDirections
      content={{ ...content, production_policy: "dynamic-micro-narrative-v2" }}
      disabled={false}
      onChange={onChange}
    />,
  );
  expect(input.getAttribute("min")).toBe("0.5");
  expect(input.getAttribute("max")).toBe("2");
});
