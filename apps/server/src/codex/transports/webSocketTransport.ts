import WebSocket from "ws";
import type { StudioLogger } from "../../logger.js";
import { CodexUnavailableError } from "../commandResolver.js";
import type { RpcMessage } from "./types.js";

export type WebSocketTransportHandlers = {
  onMessage: (message: RpcMessage) => void;
  onClose: () => void;
  onError: (error: Error) => void;
};

export class WebSocketTransport {
  private socket: WebSocket | null = null;
  private connected = false;

  constructor(
    private readonly logger: StudioLogger,
    private readonly handlers: WebSocketTransportHandlers,
  ) {}

  get isConnected(): boolean {
    return this.connected && Boolean(this.socket && this.socket.readyState === WebSocket.OPEN);
  }

  async connect(endpoint: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(endpoint);
      this.socket = socket;
      socket.once("open", () => {
        this.connected = true;
        resolve();
      });
      socket.on("message", (data) => {
        try {
          this.handlers.onMessage(JSON.parse(data.toString()) as RpcMessage);
        } catch {
          this.logger.warn("Codex WebSocket emitted invalid JSON", { step: "codex_stream" });
        }
      });
      socket.once("error", (err) => {
        this.handlers.onError(err);
        reject(err);
      });
      socket.once("close", () => {
        this.connected = false;
        this.handlers.onClose();
      });
    });
  }

  send(payload: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
      return;
    }
    throw new CodexUnavailableError("Codex WebSocket is not open");
  }

  close(): void {
    this.connected = false;
    this.socket?.close();
    this.socket = null;
  }
}
