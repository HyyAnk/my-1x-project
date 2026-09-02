import { EventEmitter } from "node:events";
import { makeId, type AntigravityModel, type AppConfig } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import { discoverActiveSession, resolveAntigravityTarget } from "./discovery.js";
import { formatModelLabel, getAgentApiModels, getCliModels, getGoogleApiModels, parseModelListOutput, withCurrentModel } from "./models.js";
import { executeTurn, type TurnRunnerContext } from "./turnRunner.js";
import {
  AntigravityUnavailableError,
  DEFAULT_ANTIGRAVITY_MODELS,
  type ActiveSessionInfo,
  type ResolvedAntigravityTarget,
} from "./types.js";

export class AntigravityClient extends EventEmitter {
  private connected = false;
  private initialized = false;
  private resolvedTarget: ResolvedAntigravityTarget | null = null;
  private cachedModels: AntigravityModel[] | null = null;
  private readonly turnControllers = new Map<string, AbortController>();
  private readonly threadConversations = new Map<string, string>();
  private discoveredSession: ActiveSessionInfo | null = null;

  constructor(
    private readonly rootDirectory: string,
    private config: AppConfig,
    private readonly logger: StudioLogger,
  ) {
    super();
  }

  get isConnected(): boolean {
    return this.connected && this.initialized;
  }

  updateConfig(config: AppConfig): void {
    this.config = config;
    this.resolvedTarget = null;
    this.cachedModels = null;
  }

  async getModels(): Promise<AntigravityModel[]> {
    if (this.cachedModels && this.cachedModels.length > 0) {
      return withCurrentModel(this.cachedModels, this.config.antigravity.model);
    }

    const target = await this.resolveTarget().catch(() => null);
    if (target && target.kind === "agentapi") {
      const session = await this.getActiveSession();
      const models = (await getAgentApiModels(session, this.logger)) ?? DEFAULT_ANTIGRAVITY_MODELS;
      return this.cacheModels(models);
    }

    const models =
      (await getGoogleApiModels(this.config, this.logger)) ??
      (await getCliModels(target, this.rootDirectory, this.logger)) ??
      DEFAULT_ANTIGRAVITY_MODELS;
    return this.cacheModels(models);
  }

  private cacheModels(models: AntigravityModel[]): AntigravityModel[] {
    this.cachedModels = models;
    return withCurrentModel(models, this.config.antigravity.model);
  }

  parseModelListOutput(stdout: string): AntigravityModel[] {
    return parseModelListOutput(stdout);
  }

  formatModelLabel(id: string): string {
    return formatModelLabel(id);
  }

  async detectInstallation(): Promise<{
    installed: boolean;
    command: string;
    version: string | null;
    authenticated: boolean;
    error?: string;
  }> {
    try {
      const target = await this.resolveTarget();
      return { installed: true, command: target.label, version: target.version, authenticated: true };
    } catch (error) {
      return {
        installed: false,
        command: this.config.antigravity.command || "Antigravity IDE / agy",
        version: null,
        authenticated: false,
        error: error instanceof Error ? error.message : "Antigravity could not be located",
      };
    }
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    this.emit("status", "connecting");
    try {
      const target = await this.resolveTarget();
      this.resolvedTarget = target;
      this.connected = true;
      this.initialized = true;
      this.emit("status", "connected");
      this.logger.info(`Connected to Antigravity via ${target.label} (${target.version})`, { step: "antigravity_connect" });
    } catch (error) {
      await this.close();
      this.emit("status", "unavailable");
      const message = error instanceof Error ? error.message : "Unknown Antigravity connection error";
      throw new AntigravityUnavailableError(`Antigravity unavailable: ${message}`);
    }
  }

  async startThread(): Promise<string> {
    await this.ensureConnected();
    return makeId("agy_thread");
  }

  async resumeThread(threadId: string): Promise<string> {
    await this.ensureConnected();
    return threadId;
  }

  getConversationId(threadId: string): string | null {
    return this.threadConversations.get(threadId) ?? null;
  }

  async startTurn(threadId: string, prompt: string, modelOverride?: string): Promise<string> {
    await this.ensureConnected();
    const turnId = makeId("agy_turn");
    const controller = new AbortController();
    this.turnControllers.set(turnId, controller);

    const target = await this.resolveTarget();
    const session = await this.getActiveSession();

    const ctx: TurnRunnerContext = {
      rootDirectory: this.rootDirectory,
      config: this.config,
      logger: this.logger,
      target,
      session,
      threadConversations: this.threadConversations,
      onDelta: (delta: string) => {
        this.emit("notification", { method: "item/agentMessage/delta", params: { threadId, turnId, delta } });
      },
      onCompleted: (status: "completed" | "interrupted" | "failed", error?: string) => {
        if (status === "interrupted") {
          this.emit("notification", {
            method: "turn/completed",
            params: { threadId, turnId, turn: { id: turnId, threadId, status: "interrupted" } },
          });
        } else if (status === "failed") {
          this.emit("notification", { method: "error", params: { threadId, turnId, error: { message: error } } });
          this.emit("notification", {
            method: "turn/completed",
            params: { threadId, turnId, turn: { id: turnId, threadId, status: "failed", error: { message: error } } },
          });
        } else {
          this.emit("notification", {
            method: "turn/completed",
            params: { threadId, turnId, turn: { id: turnId, threadId, status: "completed" } },
          });
        }
      },
    };

    setTimeout(async () => {
      try {
        await executeTurn(threadId, turnId, prompt, controller, ctx, modelOverride);
      } finally {
        this.turnControllers.delete(turnId);
      }
    }, 0);

    return turnId;
  }

  async interruptTurn(threadId: string, turnId: string): Promise<void> {
    const controller = this.turnControllers.get(turnId);
    if (controller) {
      controller.abort();
      this.turnControllers.delete(turnId);
    }
    this.emit("notification", {
      method: "turn/completed",
      params: { threadId, turnId, turn: { id: turnId, threadId, status: "interrupted" } },
    });
  }

  async close(): Promise<void> {
    this.connected = false;
    this.initialized = false;
    for (const controller of this.turnControllers.values()) controller.abort();
    this.turnControllers.clear();
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) await this.connect();
  }

  private async resolveTarget(): Promise<ResolvedAntigravityTarget> {
    if (this.resolvedTarget) return this.resolvedTarget;
    this.resolvedTarget = await resolveAntigravityTarget(this.config, this.rootDirectory);
    return this.resolvedTarget;
  }

  async getActiveSession(forceRefresh = false): Promise<ActiveSessionInfo> {
    if (this.discoveredSession && !forceRefresh) return this.discoveredSession;
    this.discoveredSession = await discoverActiveSession(this.logger, forceRefresh);
    return this.discoveredSession;
  }
}
