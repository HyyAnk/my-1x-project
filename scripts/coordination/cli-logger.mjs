const ANSI = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  red: "\u001b[1;31m",
  blue: "\u001b[1;34m",
};

const LEVEL_COLORS = {
  INFO: "cyan",
  STEP: "blue",
  OK: "green",
  WARN: "yellow",
  ERROR: "red",
};

export function createCliLogger({ json = false, workerId = "main", stream = process.stdout } = {}) {
  const useColor = Boolean(!json && stream.isTTY && !process.env.NO_COLOR);
  const paint = (value, color) => (useColor ? `${ANSI[color]}${value}${ANSI.reset}` : value);

  function write(level, message, { step = "command", next } = {}) {
    if (json) return;
    const timestamp = paint(new Date().toISOString(), "dim");
    const levelLabel = paint(`[${level}]`, LEVEL_COLORS[level] || "cyan");
    const workerLabel = paint(`[T:${workerId}]`, "dim");
    const stepLabel = paint(`[STEP:${step}]`, "blue");
    const nextAction = next ? ` | next=${next}` : "";
    stream.write(`${timestamp} ${levelLabel} ${workerLabel} ${stepLabel} ${message}${nextAction}\n`);
  }

  return {
    info: (message, context) => write("INFO", message, context),
    step: (message, context) => write("STEP", message, context),
    ok: (message, context) => write("OK", message, context),
    warn: (message, context) => write("WARN", message, context),
    error: (message, context) => write("ERROR", message, context),
    summary({ total, success, failed, skipped = 0, retries = 0, elapsedMs }) {
      const level = failed > 0 ? "ERROR" : "OK";
      write(level, `total=${total} success=${success} failed=${failed} skipped=${skipped} retries=${retries} elapsed=${elapsedMs}ms`, {
        step: "summary",
      });
    },
    writeJson(value) {
      stream.write(`${JSON.stringify(value, null, 2)}\n`);
    },
  };
}
