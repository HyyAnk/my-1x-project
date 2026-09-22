import { readFile } from "node:fs/promises";
import type { TurnRunnerContext } from "../turnRunner.js";
import type { AntigravityImageAttachment } from "../types.js";

type GoogleApiCandidate = {
  content?: { parts?: Array<{ text?: string }> };
  finishReason?: string;
};

type GoogleApiResponse = {
  candidates?: GoogleApiCandidate[];
};

export async function runGoogleApiTurn(
  effectivePrompt: string,
  selectedModel: string,
  controller: AbortController,
  ctx: TurnRunnerContext,
  imageAttachments: readonly AntigravityImageAttachment[] = [],
): Promise<void> {
  const base = (ctx.config.antigravity.api_base_url.trim() || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
  const apiKey = ctx.config.antigravity.api_key.trim();
  const url = `${base}/models/${selectedModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const imageParts = (
    await Promise.all(
      imageAttachments.map(async (attachment) => [
        { text: `Reference image role: ${attachment.role}` },
        {
          inlineData: {
            mimeType: attachment.mimeType,
            data: (await readFile(attachment.path)).toString("base64"),
          },
        },
      ]),
    )
  ).flat();
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{ parts: [...imageParts, { text: effectivePrompt }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error("Antigravity authentication required: Google AI API key is invalid or unauthorized");
    }
    if (response.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(raw)) {
      throw new Error("Antigravity quota exceeded: Google AI rate limit or quota exceeded");
    }
    throw new Error(`Google AI request failed (${response.status}): ${raw.slice(0, 300)}`);
  }

  const payload = (await response.json()) as GoogleApiResponse;
  const output = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!output.trim()) {
    throw new Error("Antigravity process terminated with empty output");
  }

  ctx.onDelta(output);
  ctx.onCompleted("completed");
}
