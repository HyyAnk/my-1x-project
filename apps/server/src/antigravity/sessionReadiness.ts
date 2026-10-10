import { isPortResponsive } from "./discovery.js";
import { AntigravityUnavailableError, type ActiveSessionInfo } from "./types.js";

export interface SessionReadinessDeps {
  getSession: (forceRefresh: boolean) => Promise<ActiveSessionInfo>;
  isResponsive?: (address: string) => Promise<boolean>;
  /** Language-server discovery only runs on Windows; elsewhere the CLI's own discovery stays in charge. */
  canDiscoverSessions?: boolean;
}

async function isUsable(session: ActiveSessionInfo, isResponsive: (address: string) => Promise<boolean>): Promise<boolean> {
  return Boolean(session.address && session.csrfToken) && (await isResponsive(session.address!));
}

/**
 * Makes sure the AgentAPI turn will reach a live IDE session. A cached session goes stale whenever the
 * IDE restarts (new port and CSRF token), so it is re-discovered up front instead of failing the turn.
 * Throws a clear error when no reachable language server exists, before any model work starts.
 */
export async function ensureAgentApiSessionReady(deps: SessionReadinessDeps): Promise<ActiveSessionInfo> {
  const isResponsive = deps.isResponsive ?? ((address: string) => isPortResponsive(address));
  const cached = await deps.getSession(false);
  if (await isUsable(cached, isResponsive)) return cached;

  const refreshed = await deps.getSession(true);
  if (refreshed.address && (await isResponsive(refreshed.address))) return refreshed;
  if (deps.canDiscoverSessions === false) return refreshed;

  throw new AntigravityUnavailableError("Antigravity IDE session is not reachable. Open (or restart) the Antigravity IDE, then try again.");
}
