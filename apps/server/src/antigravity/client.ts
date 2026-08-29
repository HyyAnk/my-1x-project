import { EventEmitter } from "node:events";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { makeId, type AntigravityModel, type AppConfig } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import { discoverActiveSession, getAntigravityBaseDir, resolveAntigravityTarget } from "./discovery.js";
import { formatModelLabel, getAgentApiModels, getCliModels, getGoogleApiModels, parseModelListOutput, withCurrentModel } from "./models.js";
import {
  deleteCascadeTrajectoryRpc,
  isStudioTaskConversation,
  loadManagedSessions,
  removeConversationArtifacts,
  removePathIfPresent,
  saveManagedSessions,
} from "./sessionManager.js";
import { executeTurn, type TurnRunnerContext } from "./turnRunner.js";
import {
  AntigravityUnavailableError,
  DEFAULT_ANTIGRAVITY_MODELS,
  describeError,
  isNotFoundError,
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
  private readonly managedSessionsFile: string;
  private readonly managedConversations = new Set<string>();
  private discoveredSession: ActiveSessionInfo | null = null;

  constructor(
    private readonly rootDirectory: string,
    private config: AppConfig,
    private readonly logger: StudioLogger,
  ) {
    super();
    this.managedSessionsFile = path.join(this.rootDirectory, ".documentary-studio", "managed_antigravity_sessions.json");
    void loadManagedSessions(this.managedSessionsFile, this.managedConversations, this.logger);
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

  async callDeleteCascadeTrajectory(conversationId: string): Promise<boolean> {
    const session = await this.getActiveSession();
    return deleteCascadeTrajectoryRpc(session, conversationId, this.logger);
  }

  async isStudioTaskConversation(convId: string): Promise<boolean> {
    return isStudioTaskConversation(convId, this.threadConversations, this.managedConversations, this.logger);
  }

  async deleteThread(threadId: string): Promise<boolean> {
    if (!this.config.antigravity.auto_delete_threads) return false;
    const conversationId = this.threadConversations.get(threadId) || (this.managedConversations.has(threadId) ? threadId : null);
    if (conversationId) {
      this.threadConversations.delete(threadId);
      this.managedConversations.delete(conversationId);
      void saveManagedSessions(this.managedSessionsFile, this.managedConversations, this.logger);

      await this.callDeleteCascadeTrajectory(conversationId);

      const baseDir = getAntigravityBaseDir();
      await removeConversationArtifacts(baseDir, conversationId, threadId, this.logger);
      const promptFile = path.join(this.rootDirectory, ".context", `task_prompt_${threadId}.md`);
      await removePathIfPresent(promptFile, "remove temporary task prompt", { conversationId, threadId }, false, this.logger);

      this.logger.debug(`Cleaned up tool-generated Antigravity session ${conversationId}`, { step: "antigravity_cleanup" });
      return true;
    }
    return true;
  }

  async cleanupOldSessions(retentionDays = 7): Promise<{ removed: number }> {
    if (!this.config.antigravity.auto_delete_threads) return { removed: 0 };
    await loadManagedSessions(this.managedSessionsFile, this.managedConversations, this.logger);
    const baseDir = getAntigravityBaseDir();
    const convDir = path.join(baseDir, "conversations");

    const activeIds = new Set(this.threadConversations.values());
    const candidates = new Set(this.managedConversations);

    try {
      const files = await readdir(convDir);
      for (const file of files) {
        if (file.endsWith(".db")) {
          const convId = file.slice(0, -3);
          if (!activeIds.has(convId) && (await this.isStudioTaskConversation(convId))) {
            candidates.add(convId);
          }
        }
      }
    } catch (error) {
      if (!isNotFoundError(error)) {
        this.logger.debug(`Failed to scan Antigravity conversations directory ${convDir}: ${describeError(error)}`, {
          step: "antigravity_cleanup_scan",
          filePath: convDir,
        });
      }
    }

    let removed = 0;
    for (const convId of Array.from(candidates)) {
      if (activeIds.has(convId)) continue;
      if (!(await this.isStudioTaskConversation(convId))) continue;

      await this.callDeleteCascadeTrajectory(convId);
      await removeConversationArtifacts(baseDir, convId, undefined, this.logger);
      this.managedConversations.delete(convId);
      removed += 1;
    }

    await saveManagedSessions(this.managedSessionsFile, this.managedConversations, this.logger);
    if (removed > 0) {
      this.logger.info(`Cleaned up ${removed} tool-generated Antigravity sessions (user conversations strictly preserved)`, {
        step: "antigravity_cleanup",
      });
    }
    return { removed };
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
      managedConversations: this.managedConversations,
      managedSessionsFile: this.managedSessionsFile,
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

  async getActiveSession(): Promise<ActiveSessionInfo> {
    if (this.discoveredSession) return this.discoveredSession;
    this.discoveredSession = await discoverActiveSession(this.logger);
    return this.discoveredSession;
  }
}
