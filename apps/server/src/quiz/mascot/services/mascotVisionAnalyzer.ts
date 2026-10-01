import type { MascotVisionAnalysisResult } from "@studio/shared";
import { buildMascotConceptPrompt } from "../../mascotPromptContract.js";
import {
  classifyHexColor,
  extractOpaqueColorStats,
  normalizeHexColor,
} from "./vision/mascotColorAnalysis.js";
import {
  callMultimodalVisionAi,
  normalizeImageInput,
  normalizeSuggestedStyle,
} from "./vision/mascotVisionAiClient.js";
import type { MascotVisionAnalyzerOptions } from "./vision/mascotVisionConfig.js";

// Re-export all sub-module members for backward compatibility
export * from "./vision/index.js";

/**
 * Performs local image pixel analysis using Sharp to extract dominant color,
 * classify color attributes, and generate baseline character tags.
 * Ignores transparent background pixels and avoids generating false black #080808.
 */
export async function performLocalPixelAnalysis(
  buffer: Buffer,
  mascotName?: string,
): Promise<MascotVisionAnalysisResult> {
  const stats = await extractOpaqueColorStats(buffer);
  const dominantHex = stats.dominantHex;
  const colorName = classifyHexColor(dominantHex);

  const tags = Array.from(
    new Set([
      "mascot",
      "character",
      colorName,
      stats.isSquare ? "square-framed" : "portrait",
      stats.hasAlpha ? "isolated" : "solid-backdrop",
    ]),
  );

  const characterName = mascotName?.trim() || "Custom Mascot";
  const subject = mascotName?.trim()
    ? `${characterName} Mascot`
    : `Custom ${colorName.charAt(0).toUpperCase() + colorName.slice(1)} Mascot`;

  const fallbackDescription = mascotName?.trim()
    ? `A cute stylized 3D character mascot named ${characterName}`
    : colorName !== "black"
      ? `A cute stylized 3D character mascot with ${colorName} accents`
      : "A cute stylized 3D character mascot";

  const suggestedMasterPrompt = buildMascotConceptPrompt({
    name: characterName,
    visual_style: "pixar_3d",
    color_theme: dominantHex,
    description: fallbackDescription,
    master_prompt: "",
  });

  return {
    subject,
    dominant_color: dominantHex,
    palette: stats.palette.length > 0 ? stats.palette : [dominantHex],
    tags,
    suggested_master_prompt: suggestedMasterPrompt,
    suggested_visual_style: "pixar_3d",
    source: "local_fallback",
    confidence: 0.6,
  };
}

/**
 * Analyzes a mascot master concept image, extracting character attributes, dominant color,
 * descriptive keywords, and visual style suggestions via multimodal AI vision with a robust local fallback.
 */
export async function analyzeMascotConceptImage(
  imageInput: Buffer | Uint8Array | string,
  options: MascotVisionAnalyzerOptions = {},
): Promise<MascotVisionAnalysisResult> {
  const { logger, aiConfig, mimeType: declaredMime, name: mascotName } = options;
  const { buffer, base64Data, mimeType } = normalizeImageInput(imageInput, declaredMime);

  // Compute local Sharp pixel analysis as baseline & fallback
  const fallbackResult = await performLocalPixelAnalysis(buffer, mascotName);

  const isAiEnabled = Boolean(aiConfig && aiConfig.enabled !== false && aiConfig.apiKey?.trim());
  if (!isAiEnabled || !aiConfig) {
    logger?.info("AI vision credentials not configured; using local sharp analysis", {
      dominantColor: fallbackResult.dominant_color,
      tagsCount: fallbackResult.tags.length,
    });
    return fallbackResult;
  }

  try {
    logger?.info("Invoking multimodal AI vision analyzer for mascot concept", {
      provider: aiConfig.provider,
      model: aiConfig.model,
    });

    const aiParsed = await callMultimodalVisionAi(base64Data, mimeType, aiConfig);

    const dominantColor = normalizeHexColor(aiParsed.dominant_color, fallbackResult.dominant_color);
    const rawPalette = Array.isArray(aiParsed.palette) ? aiParsed.palette : [dominantColor];
    const palette = rawPalette.map((c) => normalizeHexColor(c, dominantColor)).slice(0, 6);

    const rawTags = Array.isArray(aiParsed.tags) ? aiParsed.tags : [];
    const sanitizedTags = Array.from(
      new Set(
        rawTags
          .map((t) => (typeof t === "string" ? t.toLowerCase().trim().replace(/[^a-z0-9 -]/g, "") : ""))
          .filter((t) => t.length > 1 && t.length <= 30),
      ),
    );
    const tags = sanitizedTags.length > 0 ? sanitizedTags.slice(0, 15) : fallbackResult.tags;

    const subject =
      typeof aiParsed.subject === "string" && aiParsed.subject.trim()
        ? aiParsed.subject.trim()
        : fallbackResult.subject;

    const suggestedVisualStyle = normalizeSuggestedStyle(aiParsed.suggested_visual_style);
    const suggestedMasterPrompt =
      typeof aiParsed.suggested_master_prompt === "string" && aiParsed.suggested_master_prompt.trim()
        ? aiParsed.suggested_master_prompt.trim()
        : fallbackResult.suggested_master_prompt;

    return {
      subject,
      dominant_color: dominantColor,
      palette: palette.length > 0 ? palette : [dominantColor],
      tags,
      suggested_master_prompt: suggestedMasterPrompt,
      suggested_visual_style: suggestedVisualStyle,
      source: "ai_vision",
      confidence: 0.95,
    };
  } catch (aiErr) {
    logger?.warn("Multimodal AI vision analysis failed or timed out, gracefully falling back to local analysis", {
      reason: aiErr instanceof Error ? aiErr.message : String(aiErr),
    });
    return fallbackResult;
  }
}
