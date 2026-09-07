import type { MascotActionType, MascotMotionPreset } from "../../enums/mascot.js";

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
