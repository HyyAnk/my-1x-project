import sharp from "sharp";
import {
  type AppConfig,
  type MascotVisionAnalysisResult,
  type QuizImageStyle,
  QuizImageStyleSchema,
} from "@studio/shared";
import type { StudioLogger } from "../../../logger.js";
import { buildMascotConceptPrompt } from "../../mascotPromptContract.js";

export interface MascotVisionAiConfig {
  enabled?: boolean;
  provider?: "google" | "openai" | "custom" | "auto";
  apiKey?: string;
  apiBaseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export interface MascotVisionAnalyzerOptions {
  aiConfig?: MascotVisionAiConfig;
  logger?: StudioLogger;
  mimeType?: string;
  name?: string;
}

export const MASCOT_VISION_ANALYSIS_PROMPT = `
You are an expert character designer and vision AI analyzer.
Analyze the provided character/mascot image in detail.
Extract character attributes and return ONLY a JSON object matching this schema:
{
  "subject": "Concise description of the character subject/species, e.g., 'cute blue robot with antenna' or 'fluffy red fox in astronaut helmet'",
  "dominant_color": "Dominant hex color code representing the main theme, e.g., '#00D2FF'",
  "palette": ["List of 2 to 5 primary hex color codes detected in the character"],
  "tags": ["6 to 12 descriptive keywords, including species, materials, colors, key accessories, and aesthetic"],
  "suggested_visual_style": "One of: pixar_3d, flat_vector, kawaii_chibi, natural_realism, plastic_toy",
  "suggested_master_prompt": "A detailed 1-2 sentence concept art prompt capturing this exact character identity, proportions, and features for generating consistent poses"
}
`.trim();

/**
 * Classifies an RGB hex color into a human-readable English color name.
 */
export function classifyHexColor(hex: string): string {
  const clean = hex.replace(/^#/, "");
  if (clean.length !== 6) return "cyan";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  if (d === 0) {
    if (l < 0.15) return "black";
    if (l > 0.85) return "white";
    return "gray";
  }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  if (l < 0.12) return "black";
  if (l > 0.88 && s < 0.2) return "white";
  if (s < 0.15) return "gray";

  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  } else if (max === g) {
    h = ((b - r) / d + 2) * 60;
  } else {
    h = ((r - g) / d + 4) * 60;
  }

  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 70) return "yellow";
  if (h < 165) return "green";
  if (h < 200) return "cyan";
  if (h < 260) return "blue";
  if (h < 315) return "purple";
  return "pink";
}

/**
 * Normalizes any visual style string to a valid QuizImageStyle.
 */
export function normalizeSuggestedStyle(style?: string): QuizImageStyle {
  if (!style) return "pixar_3d";
  const parsed = QuizImageStyleSchema.safeParse(style.toLowerCase().trim());
  if (parsed.success) return parsed.data;

  const lowered = style.toLowerCase();
  if (lowered.includes("vector") || lowered.includes("flat") || lowered.includes("2d")) return "flat_vector";
  if (lowered.includes("chibi") || lowered.includes("kawaii") || lowered.includes("anime")) return "kawaii_chibi";
  if (lowered.includes("real") || lowered.includes("natural") || lowered.includes("cgi")) return "natural_realism";
  if (lowered.includes("toy") || lowered.includes("plastic") || lowered.includes("vinyl")) return "plastic_toy";
  return "pixar_3d";
}

/**
 * Normalizes hex colors into standard 7-character #rrggbb format.
 */
export function normalizeHexColor(hex?: string, fallback = "#06b6d4"): string {
  if (!hex || typeof hex !== "string") return fallback;
  const trimmed = hex.trim();
  const match6 = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  if (match6) return `#${match6[1].toLowerCase()}`;
  const match3 = trimmed.match(/^#?([0-9a-fA-F]{3})$/);
  if (match3) {
    const chars = match3[1].split("");
    return `#${chars.map((c) => c + c).join("").toLowerCase()}`;
  }
  return fallback;
}

function colorEuclideanDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

export interface OpaqueColorStats {
  dominantHex: string;
  palette: string[];
  hasAlpha: boolean;
  isSquare: boolean;
  opaquePixelCount: number;
}

/**
 * Extracts dominant color and palette by filtering out transparent or near-transparent pixels (alpha < 32)
 * and ignoring dark transparent edge bleed artifacts.
 */
export async function extractOpaqueColorStats(buffer: Buffer): Promise<OpaqueColorStats> {
  let isSquare = true;
  let hasAlpha = false;

  try {
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    if (meta.width && meta.height) {
      isSquare = Math.abs(meta.width - meta.height) <= 32;
    }
    hasAlpha = Boolean(meta.hasAlpha);

    const { data } = await sharp(buffer, { failOn: "none" })
      .resize(96, 96, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const bins = new Map<number, { count: number; rSum: number; gSum: number; bSum: number }>();
    let opaquePixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      // Exclude transparent and semi-transparent fringe pixels (alpha < 32)
      if (a < 32) continue;
      opaquePixels++;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const qr = r >> 4;
      const qg = g >> 4;
      const qb = b >> 4;
      const key = (qr << 8) | (qg << 4) | qb;

      let entry = bins.get(key);
      if (!entry) {
        entry = { count: 0, rSum: 0, gSum: 0, bSum: 0 };
        bins.set(key, entry);
      }
      entry.count++;
      entry.rSum += r;
      entry.gSum += g;
      entry.bSum += b;
    }

    if (opaquePixels === 0 || bins.size === 0) {
      return {
        dominantHex: "#06b6d4",
        palette: ["#06b6d4"],
        hasAlpha,
        isSquare,
        opaquePixelCount: 0,
      };
    }

    const sortedBins = Array.from(bins.values())
      .map((b) => ({
        count: b.count,
        r: Math.round(b.rSum / b.count),
        g: Math.round(b.gSum / b.count),
        b: Math.round(b.bSum / b.count),
        isDarkBleed: b.rSum / b.count <= 15 && b.gSum / b.count <= 15 && b.bSum / b.count <= 15,
      }))
      .sort((a, b) => b.count - a.count);

    // If top bin is a dark bleed artifact (#080808 or <= 15), prefer a non-bleed bin if available
    let dominantEntry = sortedBins[0];
    if (dominantEntry.isDarkBleed && sortedBins.length > 1) {
      const nonBleed = sortedBins.find((entry) => !entry.isDarkBleed);
      if (nonBleed) {
        dominantEntry = nonBleed;
      }
    }

    const toHex = (r: number, g: number, b: number) =>
      `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toLowerCase();

    let dominantHex = toHex(dominantEntry.r, dominantEntry.g, dominantEntry.b);
    if ((dominantHex === "#080808" || dominantHex === "#000000") && hasAlpha) {
      dominantHex = "#06b6d4";
    }

    // Build palette with up to 4 distinct representative colors
    const paletteEntries = [dominantEntry];
    for (const entry of sortedBins) {
      if (paletteEntries.length >= 4) break;
      if (entry.isDarkBleed) continue;
      const isDistinct = paletteEntries.every(
        (p) => colorEuclideanDistance(p.r, p.g, p.b, entry.r, entry.g, entry.b) > 40,
      );
      if (isDistinct) {
        paletteEntries.push(entry);
      }
    }

    const palette = paletteEntries.map((e) => toHex(e.r, e.g, e.b));

    return {
      dominantHex,
      palette,
      hasAlpha,
      isSquare,
      opaquePixelCount: opaquePixels,
    };
  } catch {
    return {
      dominantHex: "#06b6d4",
      palette: ["#06b6d4"],
      hasAlpha,
      isSquare,
      opaquePixelCount: 0,
    };
  }
}

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

function normalizeImageInput(
  imageInput: Buffer | Uint8Array | string,
  declaredMimeType?: string,
): { buffer: Buffer; base64Data: string; mimeType: string } {
  let buffer: Buffer;
  let base64Data: string;
  let mimeType = declaredMimeType || "image/png";

  if (typeof imageInput === "string") {
    const match = imageInput.match(/^data:([^;]+);base64,(.*)$/s);
    if (match) {
      mimeType = match[1] || mimeType;
      base64Data = match[2].replace(/\s+/g, "");
    } else {
      base64Data = imageInput.replace(/\s+/g, "");
    }
    buffer = Buffer.from(base64Data, "base64");
  } else if (Buffer.isBuffer(imageInput)) {
    buffer = imageInput;
    base64Data = buffer.toString("base64");
  } else {
    buffer = Buffer.from(imageInput);
    base64Data = buffer.toString("base64");
  }

  return { buffer, base64Data, mimeType };
}

function extractJsonPayload(text: string): string {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return fencedMatch ? fencedMatch[1].trim() : text.trim();
}

/**
 * Invokes multimodal vision AI (Google Gemini or OpenAI-compatible) to profile the character concept image.
 */
async function callMultimodalVisionAi(
  base64Data: string,
  mimeType: string,
  aiConfig: MascotVisionAiConfig,
): Promise<Partial<MascotVisionAnalysisResult>> {
  const provider = aiConfig.provider || (aiConfig.apiKey?.startsWith("sk-") ? "openai" : "google");
  const timeoutMs = aiConfig.timeoutMs || 12000;
  const signal = AbortSignal.timeout(timeoutMs);

  if (provider === "openai" || provider === "custom") {
    const baseUrl = (aiConfig.apiBaseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = aiConfig.model || "gpt-4o-mini";
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${aiConfig.apiKey || ""}`,
      },
      signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: MASCOT_VISION_ANALYSIS_PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Data}` },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI-compatible vision request failed (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const rawContent = data.choices?.[0]?.message?.content || "";
    return JSON.parse(extractJsonPayload(rawContent)) as Partial<MascotVisionAnalysisResult>;
  }

  // Google Gemini provider (default)
  const baseUrl = (aiConfig.apiBaseUrl || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
  const model = aiConfig.model || "gemini-2.5-flash";
  const url = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(aiConfig.apiKey || "")}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: MASCOT_VISION_ANALYSIS_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Gemini vision request failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawContent = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return JSON.parse(extractJsonPayload(rawContent)) as Partial<MascotVisionAnalysisResult>;
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

    const subject = typeof aiParsed.subject === "string" && aiParsed.subject.trim()
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

function resolveGoogleVisionConfig(config?: AppConfig): MascotVisionAiConfig | null {
  const apiKey =
    config?.antigravity?.api_key?.trim() ||
    process.env.ANTIGRAVITY_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    "";
  if (!apiKey) return null;

  return {
    enabled: true,
    provider: "google",
    apiKey,
    apiBaseUrl: config?.antigravity?.api_base_url?.trim() || "https://generativelanguage.googleapis.com/v1beta",
    model: config?.antigravity?.model?.trim() || "gemini-2.5-flash",
    timeoutMs: 12000,
  };
}

function resolveOpenAiVisionConfig(config?: AppConfig): MascotVisionAiConfig | null {
  const apiKey = config?.codex?.api_key?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
  if (!apiKey) return null;

  return {
    enabled: true,
    provider: "openai",
    apiKey,
    apiBaseUrl: config?.codex?.api_base_url?.trim() || "https://api.openai.com/v1",
    model: config?.codex?.model?.trim() || "gpt-4o-mini",
    timeoutMs: 12000,
  };
}

/**
 * Resolves vision AI analyzer configuration from application settings and environment.
 */
export function resolveMascotVisionAiConfig(config?: AppConfig): MascotVisionAiConfig {
  const googleConfig = resolveGoogleVisionConfig(config);
  if (googleConfig) return googleConfig;

  const openAiConfig = resolveOpenAiVisionConfig(config);
  if (openAiConfig) return openAiConfig;

  return {
    enabled: false,
  };
}
