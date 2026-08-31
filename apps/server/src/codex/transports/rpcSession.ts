import { CodexUnavailableError } from "../commandResolver.js";
import type { StdioTransport } from "./stdioTransport.js";
import type { WebSocketTransport } from "./webSocketTransport.js";
import type { CodexServerRequest, Pending, RpcMessage } from "./types.js";

export class RpcSession {
  private readonly pending = new Map<number, Pending>();
  private requestId = 1;

  request(
    method: string,
    params: Record<string, unknown>,
    wsTransport: WebSocketTransport | null,
    stdioTransport: StdioTransport | null,
  ): Promise<unknown> {
    const id = this.requestId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex request timed out: ${method}`));
      }, 120_000);
      this.pending.set(id, { resolve, reject, timer });
      this.send({ method, id, params }, wsTransport, stdioTransport);
    });
  }

  send(message: RpcMessage, wsTransport: WebSocketTransport | null, stdioTransport: StdioTransport | null): void {
    const payload = JSON.stringify(message);
    if (wsTransport?.isConnected) {
      wsTransport.send(payload);
      return;
    }
    if (stdioTransport?.isConnected) {
      stdioTransport.send(payload);
      return;
    }
    throw new CodexUnavailableError("No Codex transport is connected");
  }

  handleMessage(
    message: RpcMessage,
    onServerRequest: (req: CodexServerRequest) => void,
    onNotification: (notif: { method: string; params: Record<string, unknown> }) => void,
  ): void {
    if (typeof message.id === "number" && message.method) {
      onServerRequest({ id: message.id, method: message.method, params: message.params ?? {} });
      return;
    }
    if (typeof message.id === "number") {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message ?? "Codex request failed"));
      else pending.resolve(message.result);
      return;
    }
    if (message.method) onNotification({ method: message.method, params: message.params ?? {} });
  }

  rejectAll(error: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }
}
