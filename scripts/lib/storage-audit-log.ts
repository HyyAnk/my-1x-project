type Level = "INFO" | "STEP" | "OK" | "WARN" | "ERROR";
const colors: Record<Level, string> = { INFO: "36", STEP: "1;34", OK: "32", WARN: "33", ERROR: "1;31" };

export function storageLog(level: Level, step: string, message: string): void {
  const line = `[${new Date().toISOString()}] [${level}] [T:storage-audit] [STEP:${step}] ${message}`;
  const color = process.stdout.isTTY && !process.env.NO_COLOR;
  process.stdout.write(color ? `\u001b[${colors[level]}m${line}\u001b[0m\n` : `${line}\n`);
}
