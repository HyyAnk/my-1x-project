import { z } from "zod";

export const MascotActionTypeSchema = z.enum(["idle", "wave", "thinking", "point", "celebrate", "oops", "outro"]);
export type MascotActionType = z.infer<typeof MascotActionTypeSchema>;

export const ALL_MASCOT_ACTIONS: MascotActionType[] = ["idle", "wave", "thinking", "point", "celebrate", "oops", "outro"];

export const MascotMotionPresetSchema = z.enum(["breathe", "sway", "jump", "shake", "wave", "point", "pulse", "float", "none"]);
export type MascotMotionPreset = z.infer<typeof MascotMotionPresetSchema>;

export const MascotMotionIntensitySchema = z.enum(["subtle", "normal", "dynamic"]);
export type MascotMotionIntensity = z.infer<typeof MascotMotionIntensitySchema>;

export const MASCOT_ACTION_META: Record<
  MascotActionType,
  {
    label: string;
    description: string;
    defaultFps: number;
    defaultFrames: number;
    icon: string;
    usage: string;
    motionPreset: MascotMotionPreset;
  }
> = {
  idle: {
    label: "Idle / Listening (Breathing Pose)",
    description: "Natural subtle breathing and blinking pose while questions are read",
    defaultFps: 6,
    defaultFrames: 1,
    icon: "🧘",
    usage: "During question reading and transitions",
    motionPreset: "breathe",
  },
  wave: {
    label: "Wave Hello (Intro Greeting)",
    description: "Playful welcoming wave gesture at opening",
    defaultFps: 8,
    defaultFrames: 1,
    icon: "👋",
    usage: "Episode intro opening",
    motionPreset: "wave",
  },
  thinking: {
    label: "Thinking (Question & Countdown)",
    description: "Chin-resting, pondering or companion pose while question is presented and timer counts down",
    defaultFps: 8,
    defaultFrames: 1,
    icon: "🤔",
    usage: "Question presentation and countdown phase",
    motionPreset: "sway",
  },
  point: {
    label: "Point Board (Explanation Highlight)",
    description: "Pointing hand or pointer stick at question / explanation card",
    defaultFps: 8,
    defaultFrames: 1,
    icon: "👉",
    usage: "Answer explanation & Fact Card",
    motionPreset: "point",
  },
  celebrate: {
    label: "Celebrate (Reveal & Fact Reading)",
    description: "Jumping with joy, raised hands or celebratory pose during reveal and fun fact",
    defaultFps: 10,
    defaultFrames: 1,
    icon: "🎉",
    usage: "Answer reveal and Fact reading phase",
    motionPreset: "jump",
  },
  oops: {
    label: "Oops / Confused (Time Out)",
    description: "Scratching head or shrugging with playful comical reaction",
    defaultFps: 8,
    defaultFrames: 1,
    icon: "😅",
    usage: "Time out / Wrong answer",
    motionPreset: "shake",
  },
  outro: {
    label: "Wave Bye & CTA (Ending)",
    description: "Waving goodbye and pointing to Like, Subscribe, Comment",
    defaultFps: 8,
    defaultFrames: 1,
    icon: "🌟",
    usage: "Episode outro ending",
    motionPreset: "wave",
  },
};

export const MascotPositionSchema = z.enum(["bottom_left", "bottom_right"]);
export type MascotPosition = z.infer<typeof MascotPositionSchema>;

export const MascotStateSchema = z.enum(["idle", "wave", "curious", "thinking", "point", "surprised", "celebrate", "encourage"]);
export type MascotState = z.infer<typeof MascotStateSchema>;

export const MASCOT_THINKING_SLOT_PRESETS: Record<number, string> = {
  1: "Pondering thoughtfully, resting chin on hand, looking upward curiously",
  2: "Holding a small vintage magnifying glass, carefully inspecting a clue",
  3: "Scratching back of head with tilted puzzled expression, cute small question mark",
  4: "Both hands on cheeks in deep concentration, wide sparkling thinking eyes",
  5: "Tapping index finger against chin, slight inquisitive smile, floating glowing lightbulb spark",
  6: "Crossing arms thoughtfully, looking sideways analyzing clues",
  7: "Holding a miniature countdown hourglass, focused timing gaze",
  8: "Reading a tiny glowing hint scroll or clue notebook with intense focus",
  9: "One finger raised to lips in a quiet shushing thinking pose, analyzing deductions",
  10: "Eureka moment with excited realization, snapping fingers with a brilliant spark",
};

export const MASCOT_CELEBRATE_SLOT_PRESETS: Record<number, string> = {
  1: "Joyful jump with both arms raised high in triumphant victory, big radiant smile",
  2: "Holding a shiny golden trophy cup proudly above head, sparkling confetti",
  3: "Playful wink with double victory V-signs, festive confetti fluttering",
  4: "Both thumbs up enthusiastically with wide cheerful grin, celebratory sparkles",
  5: "Throwing colorful confetti into the air with energetic joyful dance",
  6: "Punching the air excitedly in triumph, standing tall with proud champion stance",
  7: "Blowing a party horn with ribbon streamers and joyful glittering star accents",
  8: "Making a big cute heart shape with both hands, happy closed-eye smile",
  9: "Graceful theatrical bow with arm flourish, thanking the audience proudly",
  10: "Holding a winner certificate ribbon or gold medal, glowing with accomplishment",
};

export function getMascotSlotDefaultPreset(state: "thinking" | "celebrate", slotIndex = 1): string {
  if (state === "celebrate") {
    return (
      MASCOT_CELEBRATE_SLOT_PRESETS[slotIndex] ||
      MASCOT_ACTION_META.celebrate.description
    );
  }
  return (
    MASCOT_THINKING_SLOT_PRESETS[slotIndex] ||
    MASCOT_ACTION_META.thinking.description
  );
}
