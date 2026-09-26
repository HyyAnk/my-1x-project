type ContentOptions = {
  imageAttachments?: Array<{ path: string; role: string }>;
};

export class FakeGeminiFlashClient {
  readonly attachments: Array<Array<{ path: string; role: string }>> = [];
  readonly generationPrompts: string[] = [];
  reviewCalls = 0;
  identityCalls = 0;
  identityFailure = false;
  identityGate?: () => Promise<void>;
  reviewFailure: "none" | "error" | "timeout" = "none";
  invalidIntro = false;
  malformedOutput = false;
  generationFailure: "none" | "error" | "timeout" | "reference" = "none";
  failOutro = false;
  delayMs = 0;
  connectCalls = 0;
  generationGate?: (prompt: string) => Promise<void>;

  async connect(): Promise<void> {
    this.connectCalls += 1;
  }

  async generateContent(prompt: string, options?: ContentOptions): Promise<string> {
    this.attachments.push(options?.imageAttachments ?? []);
    if (prompt.startsWith("SCRIPT PRODUCTION QUALITY REVIEW")) {
      this.reviewCalls += 1;
      if (this.reviewFailure !== "none") {
        const error = new Error(this.reviewFailure === "timeout" ? "Forced quality-review timeout" : "Forced quality-review failure");
        if (this.reviewFailure === "timeout") error.name = "TimeoutError";
        throw error;
      }
      const overloaded = prompt.includes("Walks without permission");
      return JSON.stringify({
        findings: overloaded
          ? [
              {
                code: "ACTION_OVERLOAD",
                severity: "error",
                path: "timeline.0.action",
                message: "One principal action is possible in this beat; remove the gesture chain.",
              },
            ]
          : [],
      });
    }
    if (prompt.includes("analyzing one mascot reference image")) {
      this.identityCalls += 1;
      await this.identityGate?.();
      if (this.identityFailure) throw new Error("Identity provider unavailable");
      return JSON.stringify({
        summary: "A flat asymmetric mascot with one rigid side marker and no visible limbs",
        morphology: ["Single rounded body", "No visible limbs"],
        features: [
          {
            id: "side_marker",
            description: "Rigid marker attached to the left edge",
            body_anchor: "left edge",
            material: "flat graphic",
            rigidity: "rigid",
            importance: "signature",
            visibility_rule: "Keep visible in hero framing",
          },
        ],
        capabilities: {
          locomotion: "unknown",
          grasping: "unsupported",
          pointing: "unsupported",
          waving: "unsupported",
          flight: "unsupported",
          facial_expression: "unknown",
          speech: "unknown",
          ride_vehicle: "unsupported",
          hold_props: "unsupported",
        },
        motion_constraints: ["Keep side_marker rigid and attached"],
        palette: ["#3366FF"],
        style_description: "Flat vector art with restrained motion",
        allowed_accessories: [],
      });
    }

    await this.generationGate?.(prompt);
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));

    this.generationPrompts.push(prompt);
    if (this.generationFailure === "reference") return JSON.stringify({ error_code: "MASCOT_REFERENCE_UNAVAILABLE" });
    if (this.generationFailure !== "none") {
      const error = new Error(`Forced generation ${this.generationFailure}`);
      if (this.generationFailure === "timeout") error.name = "TimeoutError";
      throw error;
    }
    if (this.malformedOutput) return "{";
    const requested = JSON.parse(prompt.split("STRUCTURE AND SEED MATRIX\n")[1].split("\n\nCHANNEL")[0]) as Array<{
      kind: string;
      duration: number;
    }>;
    const clips = Object.fromEntries(
      requested.map(({ kind, duration }) => [kind, kind === "outro" && this.failOutro ? {} : this.clip(kind === "intro", duration)]),
    );
    return JSON.stringify({
      shared: {
        style: {
          description: "Flat vector staging that preserves the supplied mascot",
          palette: ["#3366FF"],
          staging: "Center stage with open negative space",
          motion_language: "Rigid marker remains fixed",
        },
        music_direction: "Light family quiz cue",
        logo_placement: "No logo",
      },
      clips,
    });
  }

  private clip(intro: boolean, duration: number) {
    const roles = intro ? ["entrance", "brand_interaction", "handoff"] : ["recognition", "invitation", "farewell"];
    return {
      production_directions: {
        reference_mode: "character_reference",
        logo_mode: "none",
        voice_source: "none",
        logo_placement: "No logo",
        opening_state: "Centered rigid mascot",
        closing_state: "Settled mascot",
        end_hold_seconds: 0.75,
      },
      style: {
        description: "Flat vector staging that preserves the supplied mascot",
        palette: ["#3366FF"],
        staging: "Center stage with open negative space",
        motion_language: "Rigid marker remains fixed while the body translates gently",
      },
      timeline: roles.map((role, index) => ({
        beat: index + 1,
        role,
        start_seconds: [0, 2, 5][index],
        end_seconds: [2, 5, 8][index],
        action: intro && index === 0 && this.invalidIntro ? "Walks without permission" : `One clear ${role.replaceAll("_", " ")} action`,
        choreography: { primary_action: "hold", expression: "Warm", secondary_motion: "none", end_pose: "front_facing" },
        capability_ids: [],
        props: [],
        visible_feature_ids: ["side_marker"],
      })),
      voiceover: { enabled: false, lines: [] },
      audio: { music_direction: "Light family quiz cue", events: [] },
      camera: [
        { start_seconds: 0, end_seconds: duration - 1, framing: "Medium wide", movement: "Static" },
        { start_seconds: duration - 1, end_seconds: duration, framing: "Medium wide", movement: "Static locked camera" },
      ],
      consistency: { allowed_visible_text: [], restrictions: ["Keep side_marker rigid and attached"] },
    };
  }
}
