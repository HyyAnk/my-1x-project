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

export interface MascotPosePreset {
  id: string;
  label: string;
  prompt: string;
  category: string;
}

export const MASCOT_THINKING_POSES: MascotPosePreset[] = [
  // Deep Pondering
  {
    id: "thinking_classic_chin_rest",
    label: "Classic Chin-Rest",
    prompt: "Pondering thoughtfully, resting chin on hand, looking upward curiously",
    category: "Deep Pondering",
  },
  {
    id: "thinking_cheeks_in_hands",
    label: "Cheeks In Hands",
    prompt: "Both hands on cheeks in deep concentration, wide sparkling thinking eyes",
    category: "Deep Pondering",
  },
  {
    id: "thinking_crossed_arms_deduce",
    label: "Crossed Arms Deduce",
    prompt: "Crossing arms thoughtfully, looking sideways analyzing clues",
    category: "Deep Pondering",
  },
  {
    id: "thinking_tapping_pencil",
    label: "Tapping Pencil",
    prompt: "Tapping a pencil rhythmically against notepad, deep analytical focus",
    category: "Deep Pondering",
  },
  {
    id: "thinking_finger_to_temple",
    label: "Finger To Temple",
    prompt: "One index finger gently touching temple in concentrated thought, head slightly cocked",
    category: "Deep Pondering",
  },

  // Puzzled & Dilemma
  {
    id: "thinking_head_scratch_puzzled",
    label: "Head Scratch Puzzled",
    prompt: "Scratching back of head with tilted puzzled expression, cute small question mark",
    category: "Puzzled & Dilemma",
  },
  {
    id: "thinking_weighing_options",
    label: "Weighing Options",
    prompt: "Holding both hands open like balance scales, weighing two choices inquisitively",
    category: "Puzzled & Dilemma",
  },
  {
    id: "thinking_shushing_focus",
    label: "Shushing Focus",
    prompt: "One finger raised to lips in a quiet shushing thinking pose, analyzing deductions",
    category: "Puzzled & Dilemma",
  },
  {
    id: "thinking_tilted_wonder",
    label: "Tilted Wonder",
    prompt: "Head tilted with curious wide eyes and wondering eyebrows, trying to solve the puzzle",
    category: "Puzzled & Dilemma",
  },
  {
    id: "thinking_rubbing_forehead",
    label: "Rubbing Forehead",
    prompt: "Gently rubbing forehead in deep concentration, focused eyes seeking the answer",
    category: "Puzzled & Dilemma",
  },

  // Investigation & Time
  {
    id: "thinking_magnifying_glass",
    label: "Magnifying Glass",
    prompt: "Holding a small vintage magnifying glass, carefully inspecting a clue",
    category: "Investigation & Time",
  },
  {
    id: "thinking_hourglass_countdown",
    label: "Hourglass Countdown",
    prompt: "Holding a miniature countdown hourglass, focused timing gaze",
    category: "Investigation & Time",
  },
  {
    id: "thinking_stopwatch_inspection",
    label: "Stopwatch Inspection",
    prompt: "Checking a ticking pocket stopwatch with keen anticipation, watching seconds slip by",
    category: "Investigation & Time",
  },
  {
    id: "thinking_clue_scroll_notebook",
    label: "Clue Scroll / Notebook",
    prompt: "Reading a tiny glowing hint scroll or clue notebook with intense focus",
    category: "Investigation & Time",
  },
  {
    id: "thinking_binoculars_hands",
    label: "Binoculars Hands",
    prompt: "Holding hands around eyes like playful binoculars, scanning eagerly for the solution",
    category: "Investigation & Time",
  },

  // Sparks & Intuition
  {
    id: "thinking_lightbulb_eureka_spark",
    label: "Lightbulb Eureka Spark",
    prompt: "Tapping index finger against chin, slight inquisitive smile, floating glowing lightbulb spark",
    category: "Sparks & Intuition",
  },
  {
    id: "thinking_listening_for_clues",
    label: "Listening For Clues",
    prompt: "Cupping one hand behind ear, leaning forward attentively listening for subtle hints",
    category: "Sparks & Intuition",
  },
  {
    id: "thinking_peeking_through_fingers",
    label: "Peeking Through Fingers",
    prompt: "Playfully peeking between fingers held before eyes, curious and mischievous focus",
    category: "Sparks & Intuition",
  },
  {
    id: "thinking_finger_snap_realization",
    label: "Finger Snap Realization",
    prompt: "Eureka moment with excited realization, snapping fingers with a brilliant spark",
    category: "Sparks & Intuition",
  },
  {
    id: "thinking_floating_meditation",
    label: "Floating Meditation",
    prompt: "Cross-legged serene hovering pose with eyes gently closed, peaceful intuition flowing",
    category: "Sparks & Intuition",
  },
];

export const MASCOT_CELEBRATE_POSES: MascotPosePreset[] = [
  // Classic Victory
  {
    id: "celebrate_double_arms_v_jump",
    label: "Double Arms V-Jump",
    prompt: "Joyful jump with both arms raised high in triumphant victory, big radiant smile",
    category: "Classic Victory",
  },
  {
    id: "celebrate_golden_trophy_lift",
    label: "Golden Trophy Lift",
    prompt: "Holding a shiny golden trophy cup proudly above head, sparkling confetti",
    category: "Classic Victory",
  },
  {
    id: "celebrate_double_thumbs_up",
    label: "Double Thumbs Up",
    prompt: "Both thumbs up enthusiastically with wide cheerful grin, celebratory sparkles",
    category: "Classic Victory",
  },
  {
    id: "celebrate_single_fist_pump",
    label: "Single Fist Pump",
    prompt: "Punching the air excitedly in triumph, standing tall with proud champion stance",
    category: "Classic Victory",
  },
  {
    id: "celebrate_gold_medal_kiss",
    label: "Gold Medal Kiss",
    prompt: "Holding a winner certificate ribbon or gold medal, glowing with accomplishment",
    category: "Classic Victory",
  },

  // Festive Vibes
  {
    id: "celebrate_confetti_toss",
    label: "Confetti Toss",
    prompt: "Throwing colorful confetti into the air with energetic joyful dance",
    category: "Festive Vibes",
  },
  {
    id: "celebrate_party_horn_streamers",
    label: "Party Horn Streamers",
    prompt: "Blowing a party horn with ribbon streamers and joyful glittering star accents",
    category: "Festive Vibes",
  },
  {
    id: "celebrate_sparkler_wave",
    label: "Sparkler Wave",
    prompt: "Waving a sparkling celebration wand or sparkler with radiant golden trails",
    category: "Festive Vibes",
  },
  {
    id: "celebrate_party_popper_burst",
    label: "Party Popper Burst",
    prompt: "Pulling a festive party popper with colorful stream explosions and bright stars",
    category: "Festive Vibes",
  },
  {
    id: "celebrate_colorful_balloons",
    label: "Colorful Balloons",
    prompt: "Holding a buoyant cluster of colorful celebration balloons, bouncing happily",
    category: "Festive Vibes",
  },

  // Cute & Heartwarming
  {
    id: "celebrate_heart_hands_gesture",
    label: "Heart Hands Gesture",
    prompt: "Making a big cute heart shape with both hands, happy closed-eye smile",
    category: "Cute & Heartwarming",
  },
  {
    id: "celebrate_double_finger_hearts",
    label: "Double Finger Hearts",
    prompt: "Flashing cute double finger-heart signs with twinkling cheerful eyes",
    category: "Cute & Heartwarming",
  },
  {
    id: "celebrate_theatrical_bow",
    label: "Theatrical Bow",
    prompt: "Graceful theatrical bow with arm flourish, thanking the audience proudly",
    category: "Cute & Heartwarming",
  },
  {
    id: "celebrate_spinning_dance",
    label: "Spinning Dance",
    prompt: "Whirling around in an ecstatic celebratory pirouette, arms outstretched in joy",
    category: "Cute & Heartwarming",
  },
  {
    id: "celebrate_enthusiastic_applause",
    label: "Enthusiastic Applause",
    prompt: "Clapping hands enthusiastically with delighted expression and star sparkles",
    category: "Cute & Heartwarming",
  },

  // Swagger & High-Energy
  {
    id: "celebrate_cool_sunglasses_tip",
    label: "Cool Sunglasses Tip",
    prompt: "Tipping dark stylish sunglasses with a confident charming smirk and star glint",
    category: "Swagger & High-Energy",
  },
  {
    id: "celebrate_double_peace_signs",
    label: "Double Peace Signs",
    prompt: "Playful wink with double victory V-signs, festive confetti fluttering",
    category: "Swagger & High-Energy",
  },
  {
    id: "celebrate_chest_thump_pride",
    label: "Chest Thump Pride",
    prompt: "Beaming with pride while thumping chest affectionately, standing tall and victorious",
    category: "Swagger & High-Energy",
  },
  {
    id: "celebrate_mic_drop_singer",
    label: "Mic Drop Singer",
    prompt: "Dramatic playful mic drop pose with arms out, celebratory rockstar triumph",
    category: "Swagger & High-Energy",
  },
  {
    id: "celebrate_level_up_banner",
    label: "Level-Up Banner",
    prompt: "Holding or standing in front of a glowing golden 'LEVEL UP' holographic sign, beams of light",
    category: "Swagger & High-Energy",
  },
];

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

export function getMascotPoses(state: "thinking" | "celebrate"): MascotPosePreset[] {
  return state === "celebrate" ? MASCOT_CELEBRATE_POSES : MASCOT_THINKING_POSES;
}

export function getMascotPoseById(state: "thinking" | "celebrate", id: string): MascotPosePreset | undefined {
  return getMascotPoses(state).find((pose) => pose.id === id);
}

export function findPoseByPrompt(state: "thinking" | "celebrate", prompt?: string): MascotPosePreset | undefined {
  if (!prompt) return undefined;
  const normalized = prompt.trim().toLowerCase();
  return getMascotPoses(state).find((pose) => pose.prompt.trim().toLowerCase() === normalized);
}

export function getUnusedMascotPoses(
  state: "thinking" | "celebrate",
  usedPromptsOrIds: string[]
): MascotPosePreset[] {
  const usedSet = new Set(
    usedPromptsOrIds
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim().toLowerCase())
  );
  return getMascotPoses(state).filter(
    (pose) => !usedSet.has(pose.id.toLowerCase()) && !usedSet.has(pose.prompt.trim().toLowerCase())
  );
}

export function pickRandomUnusedPose(
  state: "thinking" | "celebrate",
  usedPromptsOrIds: string[]
): MascotPosePreset {
  const unused = getUnusedMascotPoses(state, usedPromptsOrIds);
  const pool = unused.length > 0 ? unused : getMascotPoses(state);
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export function pickShuffledUnusedPoses(
  state: "thinking" | "celebrate",
  usedPromptsOrIds: string[],
  count: number
): MascotPosePreset[] {
  if (count <= 0) return [];
  const allPoses = getMascotPoses(state);
  const unused = getUnusedMascotPoses(state, usedPromptsOrIds);

  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const shuffledUnused = shuffle(unused);
  if (shuffledUnused.length >= count) {
    return shuffledUnused.slice(0, count);
  }

  const selected = [...shuffledUnused];
  const selectedIds = new Set(selected.map((p) => p.id));
  const remaining = shuffle(allPoses.filter((p) => !selectedIds.has(p.id)));
  selected.push(...remaining);

  if (selected.length >= count) {
    return selected.slice(0, count);
  }

  while (selected.length < count) {
    const cycle = shuffle(allPoses);
    selected.push(...cycle);
  }

  return selected.slice(0, count);
}

export function getMascotSlotDefaultPreset(state: "thinking" | "celebrate", slotIndex = 1): string {
  if (state === "celebrate") {
    return (
      MASCOT_CELEBRATE_SLOT_PRESETS[slotIndex] ||
      MASCOT_CELEBRATE_POSES[(slotIndex - 1) % MASCOT_CELEBRATE_POSES.length]?.prompt ||
      MASCOT_ACTION_META.celebrate.description
    );
  }
  return (
    MASCOT_THINKING_SLOT_PRESETS[slotIndex] ||
    MASCOT_THINKING_POSES[(slotIndex - 1) % MASCOT_THINKING_POSES.length]?.prompt ||
    MASCOT_ACTION_META.thinking.description
  );
}

