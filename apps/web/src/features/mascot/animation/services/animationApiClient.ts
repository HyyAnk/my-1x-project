export class AnimationApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status: number, code: string = "API_ERROR", details?: unknown) {
    super(message);
    this.name = "AnimationApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  if (init?.body !== undefined && init.body !== null && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, { ...init, headers });
  const rawText = await response.text();

  let jsonBody: Record<string, unknown> | null;
  try {
    jsonBody = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
  } catch {
    jsonBody = null;
  }

  if (!response.ok) {
    const errorPayload = jsonBody?.error as { code?: string; message?: string; details?: unknown } | string | undefined;
    let message = `${response.status} ${response.statusText}`;
    let code = "API_ERROR";
    let details: unknown = undefined;

    if (typeof errorPayload === "string") {
      message = errorPayload;
    } else if (errorPayload && typeof errorPayload === "object") {
      message = errorPayload.message || message;
      code = errorPayload.code || code;
      details = errorPayload.details;
    } else if (typeof jsonBody?.message === "string") {
      message = jsonBody.message;
    }

    throw new AnimationApiError(message, response.status, code, details);
  }

  return jsonBody as T;
}
