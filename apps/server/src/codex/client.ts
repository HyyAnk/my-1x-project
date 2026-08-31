import { EventEmitter } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { makeId, type AppConfig, type CodexModel } from "@studio/shared";
import { StudioLogger } from "../logger.js";
import { DEFAULT_CODEX_MODELS, getLocalCatalogModels, withCurrentModel } from "./modelCatalog.js";
import { CodexUnavailableError, resolveCodexCommand } from "./commandResolver.js";
import type { CodexServerRequest, RpcMessage } from "./transports/types.js";
import { StdioTransport } from "./transports/stdioTransport.js";
import { WebSocketTransport } from "./transports/webSocketTransport.js";
import { OpenAiTransport } from "./transports/openAiTransport.js";
import { RpcSession } from "./transports/rpcSession.js";

const execFileAsync = promisify(execFile);

export class CodexAppServerClient extends EventEmitter {
  private stdioTransport: StdioTransport | null = null;
  private wsTransport: WebSocketTransport | null = null;
  private openAiTransport: OpenAiTransport | null = null;
  private readonly rpcSession = new RpcSession();
  private connected = false;
  private initialized = false;
  private resolvedCommand: string | null = null;

  constructor(
    private readonly rootDirectory: string,
    private config: AppConfig,
    private readonly logger: StudioLogger,
  ) {
    super();
    this.openAiTransport = new OpenAiTransport(config, {
      onDelta: (threadId, turnId, delta) => {
        this.emit("notification", { method: "item/agentMessage/delta", params: { threadId, turnId, delta } });
      },
      onCompleted: (threadId, turnId, status, error) => {
        this.emit("notification", {
          method: "turn/completed",
          params: { threadId, turnId, turn: { id: turnId, threadId, status, ...(error ? { error: { message: error } } : {}) } },
        });
      },
      onError: (threadId, turnId, message) => {
        this.emit("notification", { method: "error", params: { threadId, turnId, error: { message } } });
      },
    });
  }

  get isConnected(): boolean {
    return this.connected && this.initialized;
  }

  updateConfig(config: AppConfig): void {
    this.config = config;
    this.resolvedCommand = null;
    this.openAiTransport?.updateConfig(config);
  }

  async getModels(): Promise<CodexModel[]> {
    if (this.config.codex.transport !== "openai_compatible") {
      const catalogModels = await getLocalCatalogModels();
      return withCurrentModel(catalogModels.length ? catalogModels : DEFAULT_CODEX_MODELS, this.config.codex.model);
    }
    return this.openAiTransport ? this.openAiTransport.getModels() : DEFAULT_CODEX_MODELS;
  }

  async detectInstallation(): Promise<{ installed: boolean; command: string; version: string | null; error?: string }> {
    if (this.config.codex.transport === "openai_compatible") {
      const configured = Boolean(this.config.codex.api_base_url.trim() && this.config.codex.api_key.trim());
      return configured
        ? { installed: true, command: "Cockpit API", version: "OpenAI-compatible Responses API" }
        : { installed: false, command: "Cockpit API", version: null, error: "Set the Cockpit Base URL and API key in Settings" };
    }
    try {
      const command = await this.resolveCommand();
      const result = await execFileAsync(command, ["--version"], { cwd: this.rootDirectory, timeout: 5_000, windowsHide: true });
      const version = `${result.stdout}\n${result.stderr}`.trim().split(/\r?\n/).find(Boolean) ?? null;
      return { installed: true, command, version };
    } catch (error) {
      return {
        installed: false,
        command: this.config.codex.command || "codex",
        version: null,
        error: error instanceof Error ? error.message : "Codex command could not be executed",
      };
    }
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    this.emit("status", "connecting");
    try {
      if (this.config.codex.transport === "openai_compatible") {
        await this.openAiTransport?.testConnection();
        this.connected = true;
        this.initialized = true;
        this.emit("status", "connected");
        return;
      }
      const endpoint = this.config.codex.app_server_endpoint;
      if (endpoint === "off") throw new CodexUnavailableError("Codex App Server is disabled");
      if (endpoint.startsWith("ws://") || endpoint.startsWith("wss://")) {
        await this.connectWebSocket(endpoint);
      } else {
        await this.connectStdio();
      }
      await this.initialize();
      this.emit("status", "connected");
    } catch (error) {
      await this.close();
      this.emit("status", "unavailable");
      const message = error instanceof Error ? error.message : "Unknown Codex connection error";
      throw new CodexUnavailableError(`Codex App Server unavailable: ${message}`);
    }
  }

  async startThread(): Promise<string> {
    await this.ensureConnected();
    if (this.config.codex.transport === "openai_compatible") return makeId("thread");
    const params: Record<string, unknown> = { cwd: this.rootDirectory };
    if (this.config.codex.model) params.model = this.config.codex.model;
    const result = (await this.request("thread/start", params)) as { thread?: { id?: string } };
    const threadId = result.thread?.id;
    if (!threadId) throw new Error("Codex did not return a thread id");
    return threadId;
  }

  async resumeThread(threadId: string): Promise<string> {
    await this.ensureConnected();
    if (this.config.codex.transport === "openai_compatible") return threadId;
    const result = (await this.request("thread/resume", { threadId })) as { thread?: { id?: string } };
    return result.thread?.id ?? threadId;
  }

  async startTurn(threadId: string, prompt: string): Promise<string> {
    await this.ensureConnected();
    if (this.config.codex.transport === "openai_compatible") {
      const turnId = makeId("turn");
      const fallbackModel = (await this.getModels())[0]?.id;
      setTimeout(() => void this.openAiTransport?.runTurn(threadId, turnId, prompt, fallbackModel), 0);
      return turnId;
    }
    const result = (await this.request("turn/start", {
      threadId,
      input: [{ type: "text", text: prompt }],
      ...(this.config.codex.model ? { model: this.config.codex.model } : {}),
    })) as { turn?: { id?: string } };
    const turnId = result.turn?.id;
    if (!turnId) throw new Error("Codex did not return a turn id");
    return turnId;
  }

  async interruptTurn(threadId: string, turnId: string): Promise<void> {
    if (!this.isConnected) return;
    if (this.config.codex.transport === "openai_compatible") {
      this.openAiTransport?.interruptTurn(turnId);
      this.emit("notification", {
        method: "turn/completed",
        params: { threadId, turnId, turn: { id: turnId, threadId, status: "interrupted" } },
      });
      return;
    }
    await this.request("turn/interrupt", { threadId, turnId });
  }

  respond(requestId: number, result: unknown): void {
    if (this.config.codex.transport === "openai_compatible") return;
    this.rpcSession.send({ id: requestId, result }, this.wsTransport, this.stdioTransport);
  }

  rejectRequest(requestId: number, message: string): void {
    if (this.config.codex.transport === "openai_compatible") return;
    this.rpcSession.send({ id: requestId, error: { code: -32000, message } }, this.wsTransport, this.stdioTransport);
  }

  close(): Promise<void> {
    this.connected = false;
    this.initialized = false;
    this.rpcSession.rejectAll(new CodexUnavailableError("Codex connection closed"));
    this.wsTransport?.close();
    this.wsTransport = null;
    this.stdioTransport?.close();
    this.stdioTransport = null;
    this.openAiTransport?.close();
    return Promise.resolve();
  }

  private async connectStdio(): Promise<void> {
    const command = await this.resolveCommand();
    this.stdioTransport = new StdioTransport(this.rootDirectory, this.logger, {
      onMessage: (msg) => this.handleMessage(msg),
      onError: (err) => this.logger.warn(`Codex stdio error: ${err.message}`, { step: "codex_stdio" }),
      onStatus: (st) => this.emit("status", st),
      onExit: (code) => {
        this.connected = false;
        this.initialized = false;
        this.rpcSession.rejectAll(new CodexUnavailableError(`Codex App Server exited${code === null ? "" : ` with code ${code}`}`));
        this.emit("status", "unavailable");
        this.emit("exit", code);
      },
    });
    await this.stdioTransport.connect(command);
    this.connected = true;
  }

  private async connectWebSocket(endpoint: string): Promise<void> {
    this.wsTransport = new WebSocketTransport(this.logger, {
      onMessage: (msg) => this.handleMessage(msg),
      onError: (err) => this.logger.warn(`Codex ws error: ${err.message}`, { step: "codex_ws" }),
      onClose: () => {
        this.connected = false;
        this.initialized = false;
        this.rpcSession.rejectAll(new CodexUnavailableError("Codex WebSocket closed"));
        this.emit("status", "unavailable");
      },
    });
    await this.wsTransport.connect(endpoint);
    this.connected = true;
  }

  private async initialize(): Promise<void> {
    const result = await this.request("initialize", {
      clientInfo: { name: "ai_quiz_studio", title: "AI Quiz Studio", version: "0.1.0" },
      capabilities: {
        ...(this.config.codex.experimental_api ? { experimentalApi: true } : {}),
        mcpServerOpenaiFormElicitation: true,
      },
    });
    this.rpcSession.send({ method: "initialized", params: {} }, this.wsTransport, this.stdioTransport);
    this.initialized = Boolean(result);
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) await this.connect();
  }

  private async resolveCommand(): Promise<string> {
    if (this.resolvedCommand) return this.resolvedCommand;
    this.resolvedCommand = await resolveCodexCommand(this.config.codex.command, this.rootDirectory, this.logger);
    return this.resolvedCommand;
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    return this.rpcSession.request(method, params, this.wsTransport, this.stdioTransport);
  }

  private handleMessage(message: RpcMessage): void {
    this.rpcSession.handleMessage(
      message,
      (req) => this.emit("serverRequest", req satisfies CodexServerRequest),
      (notif) => this.emit("notification", notif),
    );
  }
}
