import { describe, expect, it, vi } from "vitest";
import { ensureAgentApiSessionReady } from "../src/antigravity/sessionReadiness.js";
import { AntigravityUnavailableError, type ActiveSessionInfo } from "../src/antigravity/types.js";

const LIVE: ActiveSessionInfo = { address: "127.0.0.1:5000", csrfToken: "csrf-new", projectId: null };
const STALE: ActiveSessionInfo = { address: "127.0.0.1:4000", csrfToken: "csrf-old", projectId: null };
const NONE: ActiveSessionInfo = { address: null, csrfToken: null, projectId: null };

const responsiveOnly = (address: string) => Promise.resolve(address === LIVE.address);

describe("ensureAgentApiSessionReady", () => {
  it("keeps a cached session that still answers without rediscovery", async () => {
    const getSession = vi.fn(async () => LIVE);
    await expect(ensureAgentApiSessionReady({ getSession, isResponsive: responsiveOnly })).resolves.toEqual(LIVE);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(getSession).toHaveBeenCalledWith(false);
  });

  it("rediscovers a stale session left behind by an IDE restart", async () => {
    const getSession = vi.fn(async (forceRefresh: boolean) => (forceRefresh ? LIVE : STALE));
    await expect(ensureAgentApiSessionReady({ getSession, isResponsive: responsiveOnly })).resolves.toEqual(LIVE);
    expect(getSession).toHaveBeenLastCalledWith(true);
  });

  it("rediscovers a cached session that lost its CSRF token", async () => {
    const getSession = vi.fn(async (forceRefresh: boolean) => (forceRefresh ? LIVE : { ...LIVE, csrfToken: null }));
    await expect(ensureAgentApiSessionReady({ getSession, isResponsive: responsiveOnly })).resolves.toEqual(LIVE);
  });

  it("fails fast with a clear error when no IDE session is reachable", async () => {
    const getSession = vi.fn(async (forceRefresh: boolean) => (forceRefresh ? NONE : STALE));
    await expect(ensureAgentApiSessionReady({ getSession, isResponsive: responsiveOnly })).rejects.toBeInstanceOf(
      AntigravityUnavailableError,
    );
  });

  it("defers to the CLI's own discovery where sessions cannot be discovered", async () => {
    const getSession = vi.fn(async () => NONE);
    await expect(ensureAgentApiSessionReady({ getSession, isResponsive: responsiveOnly, canDiscoverSessions: false })).resolves.toEqual(
      NONE,
    );
  });
});
