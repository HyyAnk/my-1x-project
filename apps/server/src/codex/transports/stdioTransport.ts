import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";
import type { StudioLogger } from "../../logger.js";
import { CodexUnavailableError } from "../commandResolver.js";
import type { RpcMessage } from "./types.js";

export type StdioTransportHandlers = {
  onMessage: (message: RpcMessage) => void;
  onExit: (code: number | null) => void;
  onError: (error: Error) => void;
  onStatus: (status: "connected" | "unavailable" | "connecting") => void;
};

export class StdioTransport {
  private process: ChildProcessWithoutNullStreams | null = null;
  private connected = false;

  constructor(
    private readonly rootDirectory: string,
    private readonly logger: StudioLogger,
    private readonly handlers: StdioTransportHandlers,
  ) {}

  get isConnected(): boolean {
    return this.connected && Boolean(this.process && !this.process.killed);
  }

  async connect(command: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        const child = spawn(command, ["app-server", "--listen", "stdio://"], {
          cwd: this.rootDirectory,
          stdio: ["pipe", "pipe", "pipe"],
          shell: /\.(cmd|bat)$/i.test(command),
          windowsHide: true,
        });
        this.process = child;
        const rl = readline.createInterface({ input: child.stdout });
        rl.on("line", (line) => {
          if (!line.trim()) return;
          try {
            this.handlers.onMessage(JSON.parse(line) as RpcMessage);
          } catch {
            this.logger.warn("Codex emitted a non-JSON line", { step: "codex_stream" });
          }
        });
        child.stderr.on("data", (chunk: Buffer) => {
          this.logger.debug(`Codex stderr: ${chunk.toString().trim()}`, { step: "codex_stderr" });
        });
        child.once("error", (err) => {
          this.handlers.onError(err);
          reject(err);
        });
        child.once("spawn", () => {
          this.connected = true;
          resolve();
        });
        child.once("exit", (code) => {
          this.connected = false;
          this.handlers.onExit(code);
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  send(payload: string): void {
    if (this.process?.stdin.writable) {
      this.process.stdin.write(`${payload}\n`);
      return;
    }
    throw new CodexUnavailableError("Codex stdio process is not writable");
  }

  close(): void {
    this.connected = false;
    if (this.process && !this.process.killed) {
      this.process.kill();
    }
    this.process = null;
  }
}
