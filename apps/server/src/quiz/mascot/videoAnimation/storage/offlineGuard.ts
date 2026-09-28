import { createConnection } from "node:net";

/** Fail closed if the configured local server port accepts connections or cannot be checked. */
export async function assertServerOffline(port: number): Promise<void> {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid server port");
  await new Promise<void>((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(2000);
    socket.once("connect", () => {
      socket.destroy();
      reject(new Error(`Server port ${port} is online; stop writers first`));
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("Offline check timed out"));
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      socket.destroy();
      if (error.code === "ECONNREFUSED") resolve();
      else reject(error);
    });
  });
}
