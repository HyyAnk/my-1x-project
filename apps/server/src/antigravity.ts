import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { execFile } from "node:child_process";
import { access, constants, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { EventEmitter } from "node:events";
import { makeId, type AppConfig, type AntigravityModel } from "@studio/shared";
import { StudioLogger } from "./logger.js";

const execFileAsync = promisify(execFile);

export const DEFAULT_ANTIGRAVITY_SUGGESTED_MODEL: AntigravityModel = {
  id: "gemini-3.7-flash-high",
  label: "Gemini 3.7 Flash (High)",
};

export const DEFAULT_ANTIGRAVITY_MODELS: AntigravityModel[] = [
  { id: "gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image" },
  { id: "gemini-3.7-flash-high", label: "Gemini 3.7 Flash (High)" },
  { id: "gemini-3.7-flash-medium", label: "Gemini 3.7 Flash (Medium)" },
  { id: "gemini-3.7-flash-low", label: "Gemini 3.7 Flash (Low)" },
  { id: "gemini-3.6-flash-high", label: "Gemini 3.6 Flash (High)" },
  { id: "gemini-3.6-flash-medium", label: "Gemini 3.6 Flash (Medium)" },
  { id: "gemini-3.6-flash-low", label: "Gemini 3.6 Flash (Low)" },
  { id: "gemini-3-flash-agent", label: "Gemini 3.5 Flash (High)" },
  { id: "gemini-3.5-flash-low", label: "Gemini 3.5 Flash (Medium)" },
  { id: "gemini-3.5-flash-extra-low", label: "Gemini 3.5 Flash (Low)" },
  { id: "gemini-pro-agent", label: "Gemini 3.1 Pro (High)" },
  { id: "gemini-3.1-pro-low", label: "Gemini 3.1 Pro (Low)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Thinking)" },
  { id: "claude-opus-4-6-thinking", label: "Claude Opus 4.6 (Thinking)" },
  { id: "gpt-oss-120b-medium", label: "GPT-OSS 120B (Medium)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
];

export class AntigravityUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AntigravityUnavailableError";
  }
}

export type ResolvedAntigravityTarget =
  | { kind: "agentapi"; command: string; argsPrefix: string[]; label: string; version: string }
  | { kind: "cli"; command: string; argsPrefix: string[]; label: string; version: string }
  | { kind: "api"; command: string; argsPrefix: string[]; label: string; version: string };

type TranscriptToolCall = {
  name?: string;
  args?: { CodeContent?: string; ReplacementContent?: string };
};

type TranscriptStep = {
  source?: string;
  type?: string;
  status?: string;
  content?: string;
  is_truncated?: boolean;
  tool_calls?: TranscriptToolCall[];
};

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export class AntigravityClient extends EventEmitter {
  private process: ChildProcessWithoutNullStreams | null = null;
  private connected = false;
  private initialized = false;
  private resolvedTarget: ResolvedAntigravityTarget | null = null;
  private cachedModels: AntigravityModel[] | null = null;
  private readonly turnControllers = new Map<string, AbortController>();
  private readonly threadConversations = new Map<string, string>();
  private readonly managedSessionsFile: string;
  private readonly managedConversations = new Set<string>();

  constructor(
    private readonly rootDirectory: string,
    private config: AppConfig,
    private readonly logger: StudioLogger,
  ) {
    super();
    this.managedSessionsFile = path.join(this.rootDirectory, ".documentary-studio", "managed_antigravity_sessions.json");
    void this.loadManagedSessions();
  }

  private async loadManagedSessions(): Promise<void> {
    try {
      const content = await readFile(this.managedSessionsFile, "utf8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        for (const id of parsed) {
          if (typeof id === "string" && id.trim()) {
            this.managedConversations.add(id.trim());
          }
        }
      }
    } catch (error) {
      if (!isNotFoundError(error)) {
        this.logger.debug(`Failed to load managed Antigravity sessions from ${this.managedSessionsFile}: ${describeError(error)}`, {
          step: "antigravity_sessions_load",
          filePath: this.managedSessionsFile,
        });
      }
    }
  }

  private async saveManagedSessions(): Promise<void> {
    try {
      await mkdir(path.dirname(this.managedSessionsFile), { recursive: true });
      await writeFile(this.managedSessionsFile, `${JSON.stringify([...this.managedConversations], null, 2)}\n`, "utf8");
    } catch (error) {
      this.logger.debug(`Failed to save managed Antigravity sessions to ${this.managedSessionsFile}: ${describeError(error)}`, {
        step: "antigravity_sessions_save",
        filePath: this.managedSessionsFile,
      });
    }
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
      return this.withCurrentModel(this.cachedModels);
    }

    const target = await this.resolveTarget().catch(() => null);
    if (target && target.kind === "agentapi") {
      const models = (await this.getAgentApiModels()) ?? DEFAULT_ANTIGRAVITY_MODELS;
      return this.cacheModels(models);
    }

    const models = (await this.getGoogleApiModels()) ?? (await this.getCliModels(target)) ?? DEFAULT_ANTIGRAVITY_MODELS;
    return this.cacheModels(models);
  }

  private cacheModels(models: AntigravityModel[]): AntigravityModel[] {
    this.cachedModels = models;
    return this.withCurrentModel(models);
  }

  private async getAgentApiModels(): Promise<AntigravityModel[] | null> {
    const session = await this.getActiveSession();
    if (!session.address || !session.csrfToken) return null;

    try {
      const port = session.address.replace(/^localhost:/, "").replace(/^127\.0\.0\.1:/, "");
      const response = await fetch(`http://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/GetAvailableModels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-codeium-csrf-token": session.csrfToken },
        body: JSON.stringify({ metadata: { ideName: "antigravity", ideVersion: "2.9.1", extensionVersion: "2.9.1" } }),
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        response?: {
          models?: Record<string, { displayName?: string; model?: string }>;
          agentModelSorts?: Array<{ groups?: Array<{ modelIds?: string[] }> }>;
        };
      };
      return this.parseAgentApiModels(payload);
    } catch (error) {
      this.logger.debug(`Language server GetAvailableModels query failed: ${describeError(error)}`, { step: "antigravity_models" });
      return null;
    }
  }

  private parseAgentApiModels(payload: {
    response?: {
      models?: Record<string, { displayName?: string; model?: string }>;
      agentModelSorts?: Array<{ groups?: Array<{ modelIds?: string[] }> }>;
    };
  }): AntigravityModel[] | null {
    const modelsDict = payload.response?.models ?? {};
    const sortIds = payload.response?.agentModelSorts?.[0]?.groups?.[0]?.modelIds ?? [];
    const models: AntigravityModel[] = [];
    const seenIds = new Set<string>();
    const seenLabels = new Set<string>();

    for (const id of sortIds) {
      const item = modelsDict[id];
      if (!item || seenIds.has(id)) continue;
      const label = item.displayName || this.formatModelLabel(id);
      seenIds.add(id);
      seenLabels.add(label);
      models.push({ id, label });
    }

    for (const [id, item] of Object.entries(modelsDict)) {
      if (seenIds.has(id) || !item.displayName || id.startsWith("chat_") || id.startsWith("tab_")) continue;
      if (this.isNonTextModel(id) || seenLabels.has(item.displayName)) continue;
      seenIds.add(id);
      seenLabels.add(item.displayName);
      models.push({ id, label: item.displayName });
    }
    return models.length > 0 ? models : null;
  }

  private async getGoogleApiModels(): Promise<AntigravityModel[] | null> {
    if (!this.config.antigravity.api_key.trim()) return null;
    try {
      const response = await this.googleApiRequest("/models");
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        models?: Array<{ name?: string; displayName?: string; supportedGenerationMethods?: string[] }>;
      };
      const models = (payload.models ?? [])
        .filter((model) => !model.supportedGenerationMethods || model.supportedGenerationMethods.includes("generateContent"))
        .map((model) => {
          const id = (model.name ?? "").replace(/^models\//, "").trim();
          return { id, label: (model.displayName ?? "").trim() || id };
        })
        .filter((model) => model.id && !this.isNonTextModel(model.id));
      return models.length > 0 ? models : null;
    } catch (error) {
      this.logger.debug(`Google AI API model query failed: ${describeError(error)}`, { step: "antigravity_models" });
      return null;
    }
  }

  private async getCliModels(target: ResolvedAntigravityTarget | null): Promise<AntigravityModel[] | null> {
    if (!target || target.kind !== "cli") return null;
    try {
      const options = {
        cwd: this.rootDirectory,
        timeout: 10_000,
        windowsHide: true,
        shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(target.command),
      };
      const result = await execFileAsync(target.command, ["models", "--json"], options).catch(async () => {
        return execFileAsync(target.command, ["model", "list", "--json"], options);
      });
      const stdout = `${result.stdout}`.trim();
      if (!stdout) return null;
      const models = this.parseModelListOutput(stdout);
      return models.length > 0 ? models : null;
    } catch (error) {
      this.logger.warn(`Antigravity dynamic model listing failed: ${describeError(error)}`, { step: "antigravity_models" });
      return null;
    }
  }

  parseModelListOutput(stdout: string): AntigravityModel[] {
    const trimmed = stdout.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const rawList = Array.isArray(parsed) ? parsed : ((parsed as { models?: unknown[] }).models ?? []);
      return rawList.map((item) => this.normalizeModel(item)).filter((model): model is AntigravityModel => Boolean(model));
    } catch {
      const lines = trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const models: AntigravityModel[] = [];
      for (const line of lines) {
        if (/^(available|models|list):?$/i.test(line)) continue;
        const cleaned = line.replace(/^[-*•]\s*/, "").trim();
        if (!cleaned) continue;
        const match = cleaned.match(/^([a-zA-Z0-9_\-\.]+)(?:\s*\((.*)\))?$/);
        if (match) {
          const id = match[1];
          const extra = match[2] ? ` (${match[2]})` : "";
          models.push({ id, label: `${this.formatModelLabel(id)}${extra}` });
        }
      }
      return models;
    }
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
      return {
        installed: true,
        command: target.label,
        version: target.version,
        authenticated: true,
      };
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

  private getAntigravityBaseDir(): string {
    return path.join(homedir(), ".gemini", "antigravity");
  }

  async callDeleteCascadeTrajectory(conversationId: string): Promise<boolean> {
    try {
      const session = await this.getActiveSession();
      if (session.address && session.csrfToken) {
        const port = session.address.replace(/^localhost:/, "").replace(/^127\.0\.0\.1:/, "");
        const res = await fetch(`http://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/DeleteCascadeTrajectory`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-codeium-csrf-token": session.csrfToken,
          },
          body: JSON.stringify({ cascadeId: conversationId }),
          signal: AbortSignal.timeout(4000),
        });
        return res.ok;
      }
    } catch (error) {
      this.logger.debug(
        `DeleteCascadeTrajectory RPC failed for ${conversationId}: ${error instanceof Error ? error.message : "unknown error"}`,
        { step: "antigravity_rpc_delete" },
      );
    }
    return false;
  }

  async isStudioTaskConversation(convId: string): Promise<boolean> {
    const currentConvId = process.env.ANTIGRAVITY_CONVERSATION_ID?.trim();
    if (currentConvId && convId === currentConvId) return false;
    if (this.threadConversations.has(convId) || Array.from(this.threadConversations.values()).includes(convId)) {
      return false;
    }

    if (this.managedConversations.has(convId)) return true;

    const baseDir = this.getAntigravityBaseDir();
    const dbPath = path.join(baseDir, "conversations", `${convId}.db`);
    try {
      const buf = await readFile(dbPath);
      const str = buf.toString("latin1");

      const studioSignatures = [
        /Task type:\s*GENERATE_/i,
        /Task type:\s*SUGGEST_TOPICS/i,
        /You are an AI illustrator\.\s*Call the generate_image tool immediately/i,
        /Please read the complete task instructions and context from file:[^ \n\r]+\.context[\\\/]task_prompt_/i,
        /task_prompt_agy_thread_/i,
        /# Documentary Treatment\b/i,
        /# Episode Visual Bible\b/i,
        /# Research Dossier\b/i,
      ];

      return studioSignatures.some((sig) => sig.test(str));
    } catch (error) {
      if (!isNotFoundError(error)) {
        this.logger.debug(`Failed to inspect Antigravity conversation ${convId} at ${dbPath}: ${describeError(error)}`, {
          step: "antigravity_conversation_inspect",
          conversationId: convId,
          filePath: dbPath,
        });
      }
      return false;
    }
  }

  async deleteThread(threadId: string): Promise<boolean> {
    if (!this.config.antigravity.auto_delete_threads) return false;
    const conversationId = this.threadConversations.get(threadId) || (this.managedConversations.has(threadId) ? threadId : null);
    if (conversationId) {
      this.threadConversations.delete(threadId);
      this.managedConversations.delete(conversationId);
      void this.saveManagedSessions();

      // 1. Send DeleteCascadeTrajectory RPC to active Language Server to remove from IDE memory, summaries and UI sidebar
      await this.callDeleteCascadeTrajectory(conversationId);

      const baseDir = this.getAntigravityBaseDir();
      await this.removeConversationArtifacts(baseDir, conversationId, threadId);
      const promptFile = path.join(this.rootDirectory, ".context", `task_prompt_${threadId}.md`);
      await this.removePathIfPresent(promptFile, "remove temporary task prompt", { conversationId, threadId });

      this.logger.debug(`Cleaned up tool-generated Antigravity session ${conversationId}`, { step: "antigravity_cleanup" });
      return true;
    }
    return true;
  }

  async cleanupOldSessions(retentionDays = 7): Promise<{ removed: number }> {
    if (!this.config.antigravity.auto_delete_threads) return { removed: 0 };
    await this.loadManagedSessions();
    const baseDir = this.getAntigravityBaseDir();
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

    // STRICT SAFETY GUARANTEE: ONLY delete sessions that were explicitly generated by studio tasks!
    // Any conversation/window created manually by the user in Antigravity will NEVER be touched.
    for (const convId of Array.from(candidates)) {
      if (activeIds.has(convId)) continue;
      if (!(await this.isStudioTaskConversation(convId))) continue;

      // 1. Notify language server via RPC
      await this.callDeleteCascadeTrajectory(convId);

      await this.removeConversationArtifacts(baseDir, convId);

      this.managedConversations.delete(convId);
      removed += 1;
    }

    await this.saveManagedSessions();
    if (removed > 0) {
      this.logger.info(`Cleaned up ${removed} tool-generated Antigravity sessions (user conversations strictly preserved)`, {
        step: "antigravity_cleanup",
      });
    }
    return { removed };
  }

  private async removeConversationArtifacts(baseDir: string, conversationId: string, threadId?: string): Promise<void> {
    const convDir = path.join(baseDir, "conversations");
    for (const extension of [".db", ".db-wal", ".db-shm"]) {
      const filePath = path.join(convDir, `${conversationId}${extension}`);
      await this.removePathIfPresent(filePath, `remove conversation database${extension}`, { conversationId, threadId });
    }
    await this.removePathIfPresent(
      path.join(baseDir, "brain", conversationId),
      "remove brain artifacts",
      { conversationId, threadId },
      true,
    );
    await this.removePathIfPresent(
      path.join(baseDir, "annotations", conversationId),
      "remove annotations",
      { conversationId, threadId },
      true,
    );
    await this.removePathIfPresent(path.join(baseDir, "context_state", `${conversationId}.pb`), "remove context state", {
      conversationId,
      threadId,
    });
  }

  private async removePathIfPresent(
    filePath: string,
    operation: string,
    context: { conversationId?: string; threadId?: string },
    recursive = false,
  ): Promise<void> {
    try {
      await rm(filePath, { force: true, recursive });
    } catch (error) {
      if (isNotFoundError(error)) return;
      this.logger.debug(`Failed to ${operation} at ${filePath}: ${describeError(error)}`, {
        step: "antigravity_cleanup",
        filePath,
        ...context,
      });
    }
  }

  async startTurn(threadId: string, prompt: string, modelOverride?: string): Promise<string> {
    await this.ensureConnected();
    const turnId = makeId("agy_turn");
    const controller = new AbortController();
    this.turnControllers.set(turnId, controller);

    setTimeout(() => void this.runTurn(threadId, turnId, prompt, controller, modelOverride), 0);
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
    if (this.process && !this.process.killed) this.process.kill();
    this.process = null;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) await this.connect();
  }

  private async runTurn(
    threadId: string,
    turnId: string,
    prompt: string,
    controller: AbortController,
    modelOverride?: string,
  ): Promise<void> {
    let promptFile: string | null = null;
    try {
      const target = await this.resolveTarget();
      const rawModel = modelOverride?.trim() || this.config.antigravity.model.trim();
      const selectedModel = rawModel || "gemini-3.1-flash-image";

      let effectivePrompt = prompt;
      if (prompt.length > 24_000) {
        const promptDir = path.join(this.rootDirectory, ".context");
        await mkdir(promptDir, { recursive: true });
        promptFile = path.join(promptDir, `task_prompt_${threadId}.md`);
        await writeFile(promptFile, prompt, "utf8");
        const promptFileUrl = `file:///${promptFile.replace(/\\/g, "/")}`;
        effectivePrompt = `Please read the complete task instructions and context from ${promptFileUrl} using view_file and execute the task strictly following those instructions. Do NOT run any other tools, codebase searches, or command executions. Produce the final output directly in your response.`;
      }

      // MODE 1: Native Antigravity IDE AgentAPI (Direct session, ZERO API Key required)
      if (target.kind === "agentapi") {
        const session = await this.getActiveSession();
        const env = {
          ...process.env,
          ...(session.address ? { ANTIGRAVITY_LS_ADDRESS: session.address } : {}),
          ...(session.csrfToken ? { ANTIGRAVITY_CSRF_TOKEN: session.csrfToken } : {}),
          ...(session.projectId ? { ANTIGRAVITY_PROJECT_ID: session.projectId } : {}),
        };

        const modelArg = selectedModel.includes("lite") ? "flash_lite" : selectedModel.includes("pro") ? "pro" : "flash";
        const args = [...target.argsPrefix, "new-conversation", `--model=${modelArg}`, effectivePrompt];

        let result: { stdout: string; stderr: string };
        try {
          result = await execFileAsync(target.command, args, {
            cwd: this.rootDirectory,
            env,
            timeout: 180_000,
            windowsHide: true,
            maxBuffer: 10 * 1024 * 1024,
            shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(target.command),
          });
        } catch (execErr: unknown) {
          const errObj = execErr as { message?: string; stdout?: string; stderr?: string };
          const details = errObj.stderr?.trim() || errObj.stdout?.trim() || errObj.message || "Unknown error";
          throw new Error(`Antigravity AgentAPI execution failed: ${details}`);
        }

        let conversationId = "";
        try {
          const parsed = JSON.parse(result.stdout) as { response?: { newConversation?: { conversationId?: string } } };
          conversationId = parsed.response?.newConversation?.conversationId ?? "";
        } catch {
          const match = result.stdout.match(/"conversationId":\s*"([^"]+)"/);
          if (match) conversationId = match[1];
        }

        if (!conversationId) {
          throw new Error(`Antigravity AgentAPI did not return a conversation ID: ${result.stdout || result.stderr}`);
        }

        this.threadConversations.set(threadId, conversationId);
        this.managedConversations.add(conversationId);
        void this.saveManagedSessions();

        // Stream and watch transcript from Antigravity brain
        const userHome = homedir();
        const baseDir = path.join(userHome, ".gemini", "antigravity", "brain", conversationId, ".system_generated", "logs");
        const transcriptFullPath = path.join(baseDir, "transcript_full.jsonl");
        const transcriptPath = path.join(baseDir, "transcript.jsonl");

        const startTime = Date.now();
        let lastActivityTime = Date.now();
        const maxWaitMs = 1_800_000; // 30 minutes overall ceiling for deep multi-source research & large scripts
        const maxIdleWaitMs = 1_200_000; // 20 minutes inactivity timeout
        let lastSeenLineCount = 0;
        let lastDelivered = "";
        let isDone = false;
        let streamInterrupted = false;
        let streamInterruptedAt = 0;

        while (Date.now() - startTime < maxWaitMs) {
          if (Date.now() - lastActivityTime > maxIdleWaitMs) {
            throw new Error("Antigravity turn timed out due to 20 minutes of inactivity from IDE session");
          }

          if (controller.signal.aborted) {
            this.emit("notification", {
              method: "turn/completed",
              params: { threadId, turnId, turn: { id: turnId, threadId, status: "interrupted" } },
            });
            return;
          }

          try {
            // Check transcript_full.jsonl first for complete content, fallback to transcript.jsonl
            const fullExists = await access(transcriptFullPath, constants.R_OK)
              .then(() => true)
              .catch(() => false);
            const normExists =
              !fullExists &&
              (await access(transcriptPath, constants.R_OK)
                .then(() => true)
                .catch(() => false));
            const filePath = fullExists ? transcriptFullPath : normExists ? transcriptPath : null;

            if (filePath) {
              const raw = await readFile(filePath, "utf8");
              const lines = raw.split(/\r?\n/).filter(Boolean);
              if (lines.length > lastSeenLineCount) {
                lastSeenLineCount = lines.length;
                lastActivityTime = Date.now();
              }
              for (const line of lines) {
                try {
                  const step = JSON.parse(line) as TranscriptStep;

                  if (
                    step.type === "ERROR_MESSAGE" &&
                    typeof step.content === "string" &&
                    step.content.includes("stream was interrupted")
                  ) {
                    if (!streamInterrupted) {
                      streamInterrupted = true;
                      streamInterruptedAt = Date.now();
                    }
                  } else if (step.source === "MODEL" || (step.tool_calls && step.tool_calls.length > 0)) {
                    // When the agent continues executing subsequent steps, the stream has successfully recovered
                    streamInterrupted = false;
                  }

                  // In Antigravity IDE transcripts:
                  // - Model final / text responses: type === "PLANNER_RESPONSE"
                  const isModel = step.source === "MODEL";
                  const isPlanner = step.type === "PLANNER_RESPONSE";
                  const hasNoToolCalls = !step.tool_calls || step.tool_calls.length === 0;
                  const isTruncated = Boolean(
                    step.is_truncated || (typeof step.content === "string" && step.content.includes("<truncated ")),
                  );
                  let currentContent = typeof step.content === "string" ? step.content : "";

                  // If content is empty in planner response, check if content was written via tool call
                  if (!currentContent.trim() && step.tool_calls && Array.isArray(step.tool_calls)) {
                    for (const call of step.tool_calls) {
                      if (call.name === "write_to_file" && call.args?.CodeContent) {
                        currentContent = call.args.CodeContent;
                      } else if (call.name === "replace_file_content" && call.args?.ReplacementContent) {
                        currentContent = call.args.ReplacementContent;
                      }
                    }
                  }

                  if (isModel && isPlanner && (hasNoToolCalls || currentContent.trim()) && currentContent.trim()) {
                    if (!isTruncated) {
                      if (currentContent.length > lastDelivered.length) {
                        const delta = currentContent.slice(lastDelivered.length);
                        lastDelivered = currentContent;
                        this.emit("notification", { method: "item/agentMessage/delta", params: { threadId, turnId, delta } });
                      }
                      if (step.status === "DONE" && lastDelivered.trim()) {
                        isDone = true;
                      }
                    }
                    // If truncated and status is DONE, wait for transcript_full.jsonl in next iteration
                  }
                } catch (error) {
                  this.logger.debug(
                    `Skipped partial Antigravity transcript line for conversation ${conversationId} from ${filePath}: ${describeError(error)}`,
                    {
                      step: "antigravity_stream_parse",
                      conversationId,
                      threadId,
                      filePath,
                    },
                  );
                }
              }
            }
            if (isDone) break;

            // If stream was interrupted by IDE language server and stayed completely inactive for >60s with zero progress
            if (
              streamInterrupted &&
              Date.now() - streamInterruptedAt > 60_000 &&
              Date.now() - lastActivityTime > 30_000 &&
              !lastDelivered.trim()
            ) {
              throw new Error("Antigravity IDE session stream was interrupted and remained inactive for 60s.");
            }
          } catch (watchErr) {
            if (watchErr instanceof Error && watchErr.message.includes("remained inactive")) {
              throw watchErr;
            }
            this.logger.debug(`Antigravity transcript poll is waiting for conversation ${conversationId}: ${describeError(watchErr)}`, {
              step: "antigravity_stream_poll",
              conversationId,
              threadId,
              filePath: transcriptFullPath,
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Final verification pass from transcript_full.jsonl to guarantee full content delivery
        try {
          if (
            await access(transcriptFullPath, constants.R_OK)
              .then(() => true)
              .catch(() => false)
          ) {
            const rawFull = await readFile(transcriptFullPath, "utf8");
            const fullLines = rawFull.split(/\r?\n/).filter(Boolean);
            for (const line of fullLines) {
              try {
                const step = JSON.parse(line) as TranscriptStep;
                const isModel = step.source === "MODEL";
                const isPlanner = step.type === "PLANNER_RESPONSE";
                const hasNoToolCalls = !step.tool_calls || step.tool_calls.length === 0;
                let fullContent = typeof step.content === "string" ? step.content : "";
                if (!fullContent.trim() && step.tool_calls && Array.isArray(step.tool_calls)) {
                  for (const call of step.tool_calls) {
                    if (call.name === "write_to_file" && call.args?.CodeContent) {
                      fullContent = call.args.CodeContent;
                    } else if (call.name === "replace_file_content" && call.args?.ReplacementContent) {
                      fullContent = call.args.ReplacementContent;
                    }
                  }
                }
                if (isModel && isPlanner && (hasNoToolCalls || fullContent.trim()) && fullContent.trim()) {
                  if (fullContent.length > lastDelivered.length) {
                    const delta = fullContent.slice(lastDelivered.length);
                    lastDelivered = fullContent;
                    this.emit("notification", { method: "item/agentMessage/delta", params: { threadId, turnId, delta } });
                  }
                  if (step.status === "DONE") {
                    isDone = true;
                  }
                }
              } catch (error) {
                this.logger.debug(
                  `Skipped partial Antigravity final transcript line for conversation ${conversationId} from ${transcriptFullPath}: ${describeError(error)}`,
                  {
                    step: "antigravity_stream_parse",
                    conversationId,
                    threadId,
                    filePath: transcriptFullPath,
                  },
                );
              }
            }
          }
        } catch (error) {
          this.logger.debug(
            `Final Antigravity transcript verification failed for conversation ${conversationId} at ${transcriptFullPath}: ${describeError(error)}`,
            {
              step: "antigravity_stream_verify",
              conversationId,
              threadId,
              filePath: transcriptFullPath,
            },
          );
        }

        if (!isDone && !lastDelivered) {
          throw new Error("Antigravity turn timed out waiting for response from active IDE session");
        }

        this.emit("notification", {
          method: "turn/completed",
          params: { threadId, turnId, turn: { id: turnId, threadId, status: "completed" } },
        });
        return;
      }

      // MODE 2: Direct Google AI API (if API Key provided)
      if (target.kind === "api" && this.config.antigravity.api_key.trim()) {
        const response = await this.googleApiRequest(`/models/${selectedModel}:generateContent`, {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
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

        const payload = (await response.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
            finishReason?: string;
          }>;
        };

        const output = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        if (!output.trim()) {
          throw new Error("Antigravity process terminated with empty output");
        }

        this.emit("notification", { method: "item/agentMessage/delta", params: { threadId, turnId, delta: output } });
        this.emit("notification", {
          method: "turn/completed",
          params: { threadId, turnId, turn: { id: turnId, threadId, status: "completed" } },
        });
        return;
      }

      // MODE 3: Headless agy CLI process
      const args = ["--model", selectedModel, "--prompt", effectivePrompt, "--output-format", "stream"];
      const child = spawn(target.command, args, {
        cwd: this.rootDirectory,
        stdio: ["pipe", "pipe", "pipe"],
        shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(target.command),
        windowsHide: true,
      });

      this.process = child;
      let fullOutput = "";
      let errorOutput = "";

      child.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        fullOutput += text;
        this.emit("notification", { method: "item/agentMessage/delta", params: { threadId, turnId, delta: text } });
      });

      child.stderr.on("data", (chunk: Buffer) => {
        errorOutput += chunk.toString();
        this.logger.debug(`Antigravity stderr: ${chunk.toString().trim()}`, { step: "antigravity_stderr" });
      });

      controller.signal.addEventListener("abort", () => {
        if (!child.killed) child.kill();
      });

      const exitCode = await new Promise<number | null>((resolve) => {
        child.on("exit", resolve);
        child.on("error", () => resolve(1));
      });

      if (controller.signal.aborted) {
        this.emit("notification", {
          method: "turn/completed",
          params: { threadId, turnId, turn: { id: turnId, threadId, status: "interrupted" } },
        });
        return;
      }

      if (exitCode !== 0 || !fullOutput.trim()) {
        const combined = `${errorOutput}\n${fullOutput}`.toLowerCase();
        if (/not logged in|unauthenticated|auth login|login required/i.test(combined)) {
          throw new Error("Antigravity authentication required: run 'agy auth login' to authenticate");
        }
        if (/quota|rate limit|429|resource_exhausted/i.test(combined)) {
          throw new Error("Antigravity quota exceeded: please wait or check your subscription plan");
        }
        if (!fullOutput.trim()) {
          throw new Error("Antigravity process terminated with empty output");
        }
        throw new Error(`Antigravity process failed with code ${exitCode}: ${errorOutput.slice(0, 300) || "unknown error"}`);
      }

      this.emit("notification", {
        method: "turn/completed",
        params: { threadId, turnId, turn: { id: turnId, threadId, status: "completed" } },
      });
    } catch (error) {
      if (controller.signal.aborted) {
        this.emit("notification", {
          method: "turn/completed",
          params: { threadId, turnId, turn: { id: turnId, threadId, status: "interrupted" } },
        });
      } else {
        const message = error instanceof Error ? error.message : "Antigravity turn execution failed";
        this.emit("notification", { method: "error", params: { threadId, turnId, error: { message } } });
        this.emit("notification", {
          method: "turn/completed",
          params: { threadId, turnId, turn: { id: turnId, threadId, status: "failed", error: { message } } },
        });
      }
    } finally {
      this.turnControllers.delete(turnId);
      if (promptFile) {
        await this.removePathIfPresent(promptFile, "remove completed turn prompt", { threadId });
      }
    }
  }

  private async resolveTarget(): Promise<ResolvedAntigravityTarget> {
    if (this.resolvedTarget) return this.resolvedTarget;

    // 1. If a custom command is explicitly configured (different from default 'agy')
    const configured = this.config.antigravity.command.trim();
    if (configured && configured !== "agy" && (await this.canExecute(configured))) {
      this.resolvedTarget = {
        kind: "cli",
        command: configured,
        argsPrefix: [],
        label: `Custom Antigravity CLI (${configured})`,
        version: "Custom CLI",
      };
      return this.resolvedTarget;
    }

    const userHome = homedir();

    // 2. Check Antigravity language_server.exe in LocalAppData / Program Files
    const localAppData = process.env.LOCALAPPDATA ?? path.join(userHome, "AppData", "Local");
    const langServerCandidates = [
      path.join(localAppData, "Programs", "Antigravity", "resources", "bin", "language_server.exe"),
      path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Antigravity", "resources", "bin", "language_server.exe"),
      path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Antigravity", "resources", "bin", "language_server.exe"),
    ];

    for (const candidate of langServerCandidates) {
      if (await this.isAccessible(candidate)) {
        this.resolvedTarget = {
          kind: "agentapi",
          command: candidate,
          argsPrefix: ["agentapi"],
          label: "Antigravity Language Server (Zero API Key)",
          version: "Active Local Engine",
        };
        return this.resolvedTarget;
      }
    }

    // 3. Check local Antigravity agentapi.bat in ~/.gemini/antigravity/bin
    const agentApiBat = path.join(userHome, ".gemini", "antigravity", "bin", "agentapi.bat");
    if (await this.isAccessible(agentApiBat)) {
      try {
        const batContent = await readFile(agentApiBat, "utf8");
        const match = batContent.match(/"([^"]+language_server(?:\.exe)?)"/i);
        if (match && (await this.isAccessible(match[1]))) {
          this.resolvedTarget = {
            kind: "agentapi",
            command: match[1],
            argsPrefix: ["agentapi"],
            label: "Antigravity Language Server (Zero API Key)",
            version: "Active Local Engine",
          };
          return this.resolvedTarget;
        }
      } catch {
        // Fall back to agentApiBat directly if reading fails
      }

      this.resolvedTarget = {
        kind: "agentapi",
        command: agentApiBat,
        argsPrefix: [],
        label: "Antigravity IDE (Native AgentAPI - Zero API Key)",
        version: "Active IDE Session",
      };
      return this.resolvedTarget;
    }

    // 4. Check CLI command (e.g. agy)
    const cliCandidate = configured || "agy";
    if (await this.canExecute(cliCandidate)) {
      this.resolvedTarget = {
        kind: "cli",
        command: cliCandidate,
        argsPrefix: [],
        label: "Antigravity CLI (agy)",
        version: "System CLI",
      };
      return this.resolvedTarget;
    }

    // 5. Search where.exe on Windows for CLI
    const whereRes = await execFileAsync("where.exe", [cliCandidate], { timeout: 3000, windowsHide: true }).catch(() => null);
    if (whereRes && whereRes.stdout) {
      const candidate = whereRes.stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find(Boolean);
      if (candidate && (await this.canExecute(candidate))) {
        this.resolvedTarget = {
          kind: "cli",
          command: candidate,
          argsPrefix: [],
          label: "Antigravity CLI (agy)",
          version: "System CLI",
        };
        return this.resolvedTarget;
      }
    }

    // 6. If Google Gemini API key configured
    if (this.config.antigravity.api_key.trim()) {
      this.resolvedTarget = {
        kind: "api",
        command: "Google AI API",
        argsPrefix: [],
        label: "Google AI REST API",
        version: "Gemini API Endpoint",
      };
      return this.resolvedTarget;
    }

    throw new AntigravityUnavailableError(
      "Antigravity engine not found. Ensure Antigravity IDE is running or provide a Gemini API Key in Settings.",
    );
  }

  private async isAccessible(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async canExecute(command: string): Promise<boolean> {
    if (!command) return false;
    try {
      await execFileAsync(command, ["--version"], {
        cwd: this.rootDirectory,
        timeout: 5_000,
        windowsHide: true,
        shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(command),
      });
      return true;
    } catch {
      return false;
    }
  }

  private withCurrentModel(models: AntigravityModel[]): AntigravityModel[] {
    const current = this.config.antigravity.model;
    if (!current || models.some((m) => m.id === current)) return models;
    const label =
      current === "pro"
        ? "Antigravity Pro (Auto)"
        : current === "flash"
          ? "Antigravity Flash (Auto)"
          : current === "flash_lite"
            ? "Antigravity Flash Lite (Auto)"
            : this.formatModelLabel(current);
    return [{ id: current, label }, ...models];
  }

  formatModelLabel(id: string): string {
    const cleanId = id.replace(/^models\//, "");
    if (cleanId === "pro") return "Antigravity Pro (Auto)";
    if (cleanId === "flash") return "Antigravity Flash (Auto)";
    if (cleanId === "flash_lite") return "Antigravity Flash Lite (Auto)";
    return cleanId
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  private normalizeModel(value: unknown): AntigravityModel | null {
    if (!value || typeof value !== "object") return null;
    const m = value as Record<string, unknown>;
    const rawId =
      typeof m.id === "string" ? m.id.trim() : typeof m.name === "string" ? m.name.trim() : typeof m.slug === "string" ? m.slug.trim() : "";
    if (!rawId || this.isNonTextModel(rawId)) return null;
    const id = rawId.replace(/^models\//, "");
    const label =
      typeof m.label === "string" ? m.label.trim() : typeof m.displayName === "string" ? m.displayName.trim() : this.formatModelLabel(id);
    return { id, label };
  }

  private isNonTextModel(id: string): boolean {
    return /(^|[-_])(embedding|imagen|image|audio|tts|whisper)([-_]|$)/i.test(id);
  }

  private googleApiRequest(endpoint: string, init: RequestInit = {}): Promise<Response> {
    const base = (this.config.antigravity.api_base_url.trim() || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
    const apiKey = this.config.antigravity.api_key.trim();
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${base}${endpoint}${apiKey ? `${separator}key=${encodeURIComponent(apiKey)}` : ""}`;
    const headers = new Headers(init.headers);
    headers.set("content-type", "application/json");
    return fetch(url, { ...init, headers });
  }

  private discoveredSession: { address: string | null; csrfToken: string | null; projectId: string | null } | null = null;

  async getActiveSession(): Promise<{ address: string | null; csrfToken: string | null; projectId: string | null }> {
    let address = process.env.ANTIGRAVITY_LS_ADDRESS?.trim() || null;
    let csrfToken = process.env.ANTIGRAVITY_CSRF_TOKEN?.trim() || null;
    let projectId = process.env.ANTIGRAVITY_PROJECT_ID?.trim() || null;

    if (this.discoveredSession) {
      return {
        address: address || this.discoveredSession.address,
        csrfToken: csrfToken || this.discoveredSession.csrfToken,
        projectId: projectId || this.discoveredSession.projectId,
      };
    }

    if (!projectId) {
      try {
        const appStoragePath = path.join(homedir(), "AppData", "Roaming", "Antigravity", "app_storage.json");
        const raw = await readFile(appStoragePath, "utf8");
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (typeof parsed.lastCreatedProjectId === "string") {
          projectId = parsed.lastCreatedProjectId.trim() || null;
        }
        if (!projectId && typeof parsed["new-convo-selected-environments"] === "string") {
          const envs = JSON.parse(parsed["new-convo-selected-environments"]) as Record<string, unknown>;
          projectId = Object.keys(envs)[0] || null;
        }
      } catch {
        // App storage might not exist
      }
    }

    if (process.platform === "win32" && (!address || !csrfToken)) {
      try {
        const psScript = `
          $proc = Get-CimInstance Win32_Process -Filter "Name = 'language_server.exe'" | Select-Object -First 1 ProcessId, CommandLine
          if (-not $proc) { exit 1 }
          $csrf = if ($proc.CommandLine -match '--csrf_token\\s+([a-zA-Z0-9\\-]+)') { $matches[1] } else { '' }
          $conns = Get-NetTCPConnection -OwningProcess $proc.ProcessId -State Listen -ErrorAction SilentlyContinue
          $port = ''
          foreach ($conn in $conns) {
            if ($conn.LocalAddress -in @('127.0.0.1', '0.0.0.0', '::1', '::')) {
              $port = $conn.LocalPort
              break
            }
          }
          Write-Output "$port|$csrf"
        `;
        const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript], {
          windowsHide: true,
          timeout: 4000,
        });

        const line = stdout.trim();
        const [port, discoveredCsrf] = line.split("|");
        if (port && !address) address = `localhost:${port}`;
        if (discoveredCsrf && !csrfToken) csrfToken = discoveredCsrf.trim();
      } catch (err) {
        this.logger.debug(`Language server session discovery failed: ${err instanceof Error ? err.message : "unknown"}`, {
          step: "antigravity_discovery",
        });
      }
    }

    this.discoveredSession = { address, csrfToken, projectId };
    if (address) process.env.ANTIGRAVITY_LS_ADDRESS = address;
    if (csrfToken) process.env.ANTIGRAVITY_CSRF_TOKEN = csrfToken;
    if (projectId) process.env.ANTIGRAVITY_PROJECT_ID = projectId;

    return this.discoveredSession;
  }
}
