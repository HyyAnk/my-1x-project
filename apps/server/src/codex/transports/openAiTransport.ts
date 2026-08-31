import { type AppConfig, type CodexModel } from "@studio/shared";
import { CodexUnavailableError } from "../commandResolver.js";
import { DEFAULT_CODEX_MODELS, extractOpenAiOutput, normalizeModel, withCurrentModel } from "../modelCatalog.js";

export type OpenAiTransportHandlers = {
  onDelta: (threadId: string, turnId: string, delta: string) => void;
  onCompleted: (threadId: string, turnId: string, status: "completed" | "interrupted" | "failed", error?: string) => void;
  onError: (threadId: string, turnId: string, message: string) => void;
};

export class OpenAiTransport {
  private readonly apiControllers = new Map<string, AbortController>();
  private connected = false;

  constructor(
    private config: AppConfig,
    private readonly handlers: OpenAiTransportHandlers,
  ) {}

  get isConnected(): boolean {
    return this.connected;
  }

  updateConfig(config: AppConfig): void {
    this.config = config;
  }

  private apiBaseUrl(): string {
    const base = this.config.codex.api_base_url.trim().replace(/\/+$/, "");
    if (!base) throw new CodexUnavailableError("Cockpit Base URL is not configured");
    return /\/v1$/i.test(base) ? base : `${base}/v1`;
  }

  private apiRequest(endpoint: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("content-type", "application/json");
    headers.set("authorization", `Bearer ${this.config.codex.api_key.trim()}`);
    return fetch(`${this.apiBaseUrl()}${endpoint}`, { ...init, headers });
  }

  async testConnection(): Promise<void> {
    if (!this.config.codex.api_base_url.trim()) throw new CodexUnavailableError("Cockpit Base URL is not configured");
    if (!this.config.codex.api_key.trim()) throw new CodexUnavailableError("Cockpit API key is not configured");
    const response = await this.apiRequest("/models");
    if (!response.ok && response.status !== 404 && response.status !== 405) {
      const detail = await response.text().catch(() => "");
      throw new CodexUnavailableError(
        `Cockpit API rejected the connection (${response.status})${detail ? `: ${detail.slice(0, 240)}` : ""}`,
      );
    }
    this.connected = true;
  }

  async getModels(): Promise<CodexModel[]> {
    try {
      const response = await this.apiRequest("/models");
      if (!response.ok) return withCurrentModel(DEFAULT_CODEX_MODELS, this.config.codex.model);
      const payload = (await response.json()) as { data?: unknown[] };
      const models = (payload.data ?? []).map((model) => normalizeModel(model)).filter((model): model is CodexModel => Boolean(model));
      return withCurrentModel(models.length ? models : DEFAULT_CODEX_MODELS, this.config.codex.model);
    } catch {
      return withCurrentModel(DEFAULT_CODEX_MODELS, this.config.codex.model);
    }
  }

  async runTurn(threadId: string, turnId: string, prompt: string, modelFallback?: string): Promise<void> {
    const controller = new AbortController();
    this.apiControllers.set(turnId, controller);
    try {
      const selectedModel = this.config.codex.model || modelFallback || DEFAULT_CODEX_MODELS[0].id;
      const response = await this.apiRequest("/responses", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          model: selectedModel,
          input: prompt,
          stream: false,
        }),
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`Cockpit API request failed (${response.status}): ${body.slice(0, 400)}`);
      const output = extractOpenAiOutput(JSON.parse(body) as Record<string, unknown>);
      this.handlers.onDelta(threadId, turnId, output);
      this.handlers.onCompleted(threadId, turnId, "completed");
    } catch (error) {
      if (controller.signal.aborted) {
        this.handlers.onCompleted(threadId, turnId, "interrupted");
      } else {
        const message = error instanceof Error ? error.message : "Cockpit API request failed";
        this.handlers.onError(threadId, turnId, message);
        this.handlers.onCompleted(threadId, turnId, "failed", message);
      }
    } finally {
      this.apiControllers.delete(turnId);
    }
  }

  interruptTurn(turnId: string): boolean {
    const controller = this.apiControllers.get(turnId);
    if (controller) {
      controller.abort();
      this.apiControllers.delete(turnId);
      return true;
    }
    return false;
  }

  close(): void {
    this.connected = false;
    for (const controller of this.apiControllers.values()) {
      controller.abort();
    }
    this.apiControllers.clear();
  }
}
