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
