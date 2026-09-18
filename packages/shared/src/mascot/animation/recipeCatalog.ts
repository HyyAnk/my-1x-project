import {
  DEFAULT_CHROMA_KEY,
  PROHIBITED_PROMPT_ELEMENTS,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  type AnimationState,
} from "./animationConstants.js";
import type { AnimationPromptContext, MascotAnimationRecipe } from "./animationTypes.js";
import { ALL_RECIPES, CELEBRATE_RECIPES, THINKING_RECIPES } from "./recipeDefinitions.js";

export { ALL_RECIPES, CELEBRATE_RECIPES, THINKING_RECIPES };

export function getAllRecipes(): readonly MascotAnimationRecipe[] {
  return ALL_RECIPES;
}

export function getRecipesByState(state: AnimationState): readonly MascotAnimationRecipe[] {
  return state === "thinking" ? THINKING_RECIPES : CELEBRATE_RECIPES;
}

export function getRecipeById(id: string): MascotAnimationRecipe | undefined {
  return ALL_RECIPES.find((r) => r.id === id);
}

export function getRecipeBySlot(state: AnimationState, slotIndex: number): MascotAnimationRecipe | undefined {
  const recipes = getRecipesByState(state);
  return recipes.find((r) => r.slot_index === slotIndex);
}

export function containsProhibitedTerms(text: string): boolean {
  const lower = text.toLowerCase();
  const rawForbiddenPatterns = [
    /\btext\b/i,
    /\bscenery\b/i,
    /\bbackground scenery\b/i,
    /\bmultiple characters\b/i,
    /\bdetached effects\b/i,
    /\bmotion lines\b/i,
    /\bmodel-generated atlas\b/i,
    /\bsprite sheet\b/i,
  ];
  return rawForbiddenPatterns.some((pattern) => pattern.test(lower));
}

export function buildAnimationPrompt(recipeOrId: MascotAnimationRecipe | string, context: AnimationPromptContext): string {
  const recipe = typeof recipeOrId === "string" ? getRecipeById(recipeOrId) : recipeOrId;
  if (!recipe) {
    throw new Error(`Unknown animation recipe: ${typeof recipeOrId === "string" ? recipeOrId : JSON.stringify(recipeOrId)}`);
  }

  const stateGuidelines =
    recipe.state === "thinking"
      ? "State Mood: Calm, focused, thoughtful contemplation. Maintain stationary grounding, subtle breathing, and focused facial expression."
      : "State Mood: Joyful, celebratory, energetic, child-safe victory. Dynamic positive celebration with beaming cheerful expression.";

  const chromaColor = context.chromaKeyColor || DEFAULT_CHROMA_KEY.color;
  const prohibitedClause = PROHIBITED_PROMPT_ELEMENTS.join(", ");

  const promptSections = [
    `Character: ${context.characterName ? `${context.characterName}, ` : ""}${context.characterDescription.trim()}.`,
    context.visualStyle ? `Visual Style: ${context.visualStyle.trim()}.` : "",
    context.anchorKeyword ? `Style Accent: ${context.anchorKeyword.trim()}.` : "",
    `Action: ${recipe.action_instruction}.`,
    stateGuidelines,
    `Frame Specifications: Exactly ${REQUIRED_FRAME_COUNT} sequential animation frames at ${REQUIRED_FPS} fps (${recipe.loop_policy === "loop" ? "smooth seamless cycle" : "returns cleanly to rested neutral pose"}).`,
    `Composition: Exactly one centered character at fixed scale and camera angle across all frames.`,
    `Background: Solid flat chroma key background (${chromaColor}), perfectly uniform with zero gradient, zero shadows on backdrop.`,
    `Strict Negative Constraints (Must Exclude): ${prohibitedClause}.`,
  ];

  return promptSections.filter(Boolean).join(" ");
}
