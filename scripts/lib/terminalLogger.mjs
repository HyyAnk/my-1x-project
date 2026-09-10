export const STYLES = {
  INFO: 36,
  STEP: "1;34",
  OK: 32,
  WARN: 33,
  ERROR: "1;31",
  DEBUG: 2,
};

const PROFILE_STYLES = [36, 32, 33, 35, 34, 96, 92, 93, 95, 94];

/**
 * @typedef {Object} LogContext
 * @property {string} [step]
 * @property {string} [workerId]
 * @property {string} [profileId]
 * @property {string} [wallet]
 * @property {import('node:stream').Writable} [stream]
 */

/**
 * Logs a single formatted line with ISO timestamp, level, context tags, and message.
 * @param {keyof typeof STYLES} level
 * @param {string} message
 * @param {LogContext} [context={}]
 */
export function log(level, message, context = {}) {
  if (level === "DEBUG" && !process.argv.includes("--debug")) return;
  const stream = context.stream || (level === "ERROR" ? process.stderr : process.stdout);
  const isTTY = Boolean(stream.isTTY);
  const color = isTTY && process.env.NO_COLOR === undefined;
  const style = (value, code) => (color ? `\u001b[${code}m${value}\u001b[0m` : value);

  const parts = [style(new Date().toISOString(), 2), style(`[${level}]`, STYLES[level] || 36)];

  if (context.workerId) parts.push(style(`[T:${context.workerId}]`, 2));
  if (context.profileId) {
    const hash = [...context.profileId].reduce((total, char) => total + char.charCodeAt(0), 0);
    parts.push(style(`[P:${context.profileId}]`, PROFILE_STYLES[hash % PROFILE_STYLES.length]));
  }
  if (context.wallet) {
    const wallet = context.wallet.length > 12 ? `${context.wallet.slice(0, 6)}...${context.wallet.slice(-4)}` : context.wallet;
    parts.push(style(`[W:${wallet}]`, 95));
  }
  if (context.step) {
    parts.push(style(`[STEP:${context.step}]`, "1;34"));
  }

  const cleanMessage = String(message).replace(/[\r\n]+/g, " ");
  parts.push(cleanMessage);
  stream.write(`${parts.join(" ")}\n`);
}

/**
 * Logs the startup summary with non-secret execution settings.
 * @param {Object} summary
 * @param {string} summary.method
 * @param {string} summary.executionMode
 * @param {number} summary.profileCount
 * @param {number} summary.concurrency
 * @param {Record<string, unknown>} [summary.config]
 * @param {import('node:stream').Writable} [stream]
 */
export function logStartupSummary({ method, executionMode, profileCount, concurrency, config = {} }, stream) {
  log("INFO", `Batch CLI Starting [Method: ${method}] [Mode: ${executionMode}] [Profiles: ${profileCount}] [Concurrency: ${concurrency}]`, {
    step: "STARTUP",
    stream,
  });
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined && value !== null && !/secret|key|token|password/i.test(key)) {
      log("INFO", `Config: ${key}=${value}`, { step: "CONFIG", stream });
    }
  }
}

/**
 * Logs the final execution summary.
 * @param {Object} summary
 * @param {number} summary.total
 * @param {number} summary.success
 * @param {number} summary.failed
 * @param {number} summary.skipped
 * @param {number} summary.retries
 * @param {number} summary.elapsedMs
 * @param {import('node:stream').Writable} [stream]
 */
export function logFinalSummary({ total, success, failed, skipped, retries, elapsedMs }, stream) {
  const level = failed > 0 ? "WARN" : "OK";
  log(
    level,
    `Execution Summary: Total=${total} Success=${success} Failed=${failed} Skipped=${skipped} Retries=${retries} Elapsed=${elapsedMs}ms`,
    { step: "COMPLETE", stream },
  );
}
