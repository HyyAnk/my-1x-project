import { RepositoryError } from "../../repository.js";
import { DEFAULT_BASE_URL } from "../gpti2Dimensions.js";

export async function checkGpti2Balance(apiKey?: string): Promise<{ balance_vnd: number; rpm?: number }> {
  const key = (apiKey || process.env.GPTI2_API_KEY || process.env.SHOPAIKEY_API_KEY || "").trim();
  if (!key) {
    throw new RepositoryError("API key for gpti2.store is not configured.", "IMAGE_PROVIDER_NOT_CONFIGURED");
  }
  const response = await fetch(`${DEFAULT_BASE_URL}/v1/balance`, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });
  const raw = await response.text();
  let payload: { balance_vnd?: number; rpm?: number; error?: { message?: string } } = {};
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    // raw non-json
  }
  if (!response.ok) {
    const msg = payload.error?.message || raw || `HTTP ${response.status}`;
    throw new RepositoryError(`gpti2.store API failed (${response.status}): ${msg}`, "IMAGE_PROVIDER_FAILED");
  }
  return {
    balance_vnd: typeof payload.balance_vnd === "number" ? payload.balance_vnd : 0,
    rpm: payload.rpm,
  };
}
