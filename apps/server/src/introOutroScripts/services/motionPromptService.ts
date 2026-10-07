import {
  type MotionPromptOutput,
  type MotionPromptRequest,
  type MotionPromptStyleMood,
  type MotionTemplateId,
  type MotionTemplateOptions,
  MotionPromptOutputSchema,
} from "@studio/shared";
import { compileOpusMotionPrompt } from "../prompts/motionPromptCompiler.js";

interface MoodThemeMapping {
  accentColor: string;
  introTemplate: MotionTemplateId;
  outroTemplate: MotionTemplateId;
  introKicker: string;
  outroHeadline: string;
  outroButton: string;
}

const MOOD_THEME_MAP: Record<MotionPromptStyleMood, MoodThemeMapping> = {
  cyberpunk: {
    accentColor: "#00FFFF",
    introTemplate: "cyber_neon",
    outroTemplate: "interactive_cta",
    introKicker: "INSERT COIN",
    outroHeadline: "CYBER CHALLENGE COMPLETE!",
    outroButton: "SUBSCRIBE FOR LEVEL 2",
  },
  high_energy: {
    accentColor: "#FF007F",
    introTemplate: "kinetic_punch",
    outroTemplate: "scorecard_recap",
    introKicker: "GET READY",
    outroHeadline: "HOW MANY DID YOU GET?",
    outroButton: "SHARE YOUR SCORE",
  },
  minimal_luxury: {
    accentColor: "#6366F1",
    introTemplate: "minimal_sleek",
    outroTemplate: "interactive_cta",
    introKicker: "FEATURED QUIZ",
    outroHeadline: "THANK YOU FOR WATCHING",
    outroButton: "EXPLORE MORE CHALLENGES",
  },
  arcade_playful: {
    accentColor: "#FFD700",
    introTemplate: "kinetic_punch",
    outroTemplate: "scorecard_recap",
    introKicker: "ARCADE TIME",
    outroHeadline: "FINAL LEADERBOARD",
    outroButton: "PLAY AGAIN TOMORROW",
  },
  epic_cinematic: {
    accentColor: "#E0A82E",
    introTemplate: "kinetic_punch",
    outroTemplate: "interactive_cta",
    introKicker: "ULTIMATE TRIAL",
    outroHeadline: "LEGENDS NEVER STOP",
    outroButton: "JOIN THE ADVENTURE",
  },
  educational_clean: {
    accentColor: "#10B981",
    introTemplate: "minimal_sleek",
    outroTemplate: "interactive_cta",
    introKicker: "DAILY KNOWLEDGE",
    outroHeadline: "GREAT LEARNING SESSION!",
    outroButton: "SUBSCRIBE FOR DAILY FACTS",
  },
};

/**
 * Heuristically infers the most suitable visual mood based on semantic keywords
 * in the quiz topic title when an explicit mood is not specified.
 */
export function inferMotionMood(topicTitle: string): MotionPromptStyleMood {
  const lower = topicTitle.toLowerCase();

  if (/\b(cyber|cyberpunk|tech|technology|robot|robots|ai|matrix|futuristic|future|digital|space|galaxy|cosmos|cosmic|alien|aliens)\b/.test(lower)) {
    return "cyberpunk";
  }
  if (/\b(game|games|gaming|gamer|arcade|retro|pixel|pixels|pixelated|cartoon|cartoons|kids|toy|toys|party)\b/.test(lower)) {
    return "arcade_playful";
  }
  if (/\b(epic|movie|movies|cinema|war|wars|empire|empires|dynasty|gladiator|gladiators|myth|mythology|mythological|hero|heroes|heroic|dragon|dragons|battle|battles)\b/.test(lower)) {
    return "epic_cinematic";
  }
  if (/\b(art|design|architecture|architectural|history|historical|literature|minimal|minimalist|philosophy|nature|ocean)\b/.test(lower)) {
    return "minimal_luxury";
  }
  if (/\b(science|scientific|math|mathematics|geography|geographic|learn|learning|school|trivia|fact|facts|biology|physics)\b/.test(lower)) {
    return "educational_clean";
  }

  return "high_energy";
}

/**
 * Generates an optimal motion template configuration and Opus-style prompt recipe
 * tailored to a specific quiz episode, topic, and channel brand.
 */
export function generateMotionPromptConfig(request: MotionPromptRequest): MotionPromptOutput {
  const placement = request.placement ?? "intro";
  const mood = request.mood ?? inferMotionMood(request.topicTitle);
  const theme = MOOD_THEME_MAP[mood];

  let recommendedTemplateId: MotionTemplateId;
  if (request.preferredTemplateId) {
    recommendedTemplateId = request.preferredTemplateId;
  } else if (placement === "outro") {
    recommendedTemplateId = theme.outroTemplate;
  } else {
    recommendedTemplateId = theme.introTemplate;
  }

  const generatedOptions: MotionTemplateOptions = {
    accentColor: theme.accentColor,
    headlineText: placement === "outro" ? theme.outroHeadline : (request.channelName ? `${request.channelName.toUpperCase()} PRESENTS` : theme.introKicker),
    subheadlineText: placement === "outro" ? theme.outroButton : request.topicTitle.toUpperCase(),
    showMascot: true,
    showParticles: true,
    soundEffectCue: true,
    customParameters: {
      mood,
      placement,
      audienceAgeBand: request.audienceAgeBand ?? "general",
    },
  };

  const animationPhilosophy = placement === "outro"
    ? `Conversion-optimized outro utilizing gamified achievement cues and a high-contrast ${theme.accentColor} interactive CTA element.`
    : `Attention-grabbing kinetic intro utilizing a ${mood} atmosphere, punchy headline hook, and deterministic 60fps spring transitions.`;

  const llmPromptRecipe = compileOpusMotionPrompt({
    topicTitle: request.topicTitle,
    channelName: request.channelName,
    placement,
    mood,
    targetDurationSeconds: request.targetDurationSeconds,
    audienceAgeBand: request.audienceAgeBand,
    recommendedTemplateId,
    accentColor: theme.accentColor,
  });

  return MotionPromptOutputSchema.parse({
    recommendedTemplateId,
    placement,
    mood,
    generatedOptions,
    animationPhilosophy,
    llmPromptRecipe,
  });
}
