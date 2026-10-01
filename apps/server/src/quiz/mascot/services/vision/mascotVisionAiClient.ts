import {
  type MascotVisionAnalysisResult,
  type QuizImageStyle,
  QuizImageStyleSchema,
} from "@studio/shared";
import type { MascotVisionAiConfig } from "./mascotVisionConfig.js";

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

export function normalizeImageInput(
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

export function extractJsonPayload(text: string): string {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return fencedMatch ? fencedMatch[1].trim() : text.trim();
}

/**
 * Invokes multimodal vision AI (Google Gemini or OpenAI-compatible) to profile the character concept image.
 */
export async function callMultimodalVisionAi(
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
