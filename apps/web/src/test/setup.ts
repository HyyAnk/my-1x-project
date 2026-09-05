import { vi } from "vitest";

class ResizeObserverMock {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const originalFetch = globalThis.fetch;

export function getMockApiResponse(pathname: string): Response {
  if (pathname === "/api/question-bank/stats") {
    return Response.json(
      {
        stats: {
          schema_version: 2,
          target_total: 20000,
          current_total: 0,
          by_archetype: {},
          by_domain: {},
          updated_at: "2026-09-05T00:00:00.000Z",
        },
      },
      { status: 200 },
    );
  }

  if (pathname === "/api/question-bank/taxonomy") {
    return Response.json(
      {
        taxonomy: {
          schema_version: 2,
          updated_at: "2026-09-05T00:00:00.000Z",
          domains: [],
        },
      },
      { status: 200 },
    );
  }

  if (pathname === "/api/question-bank/matrix-coverage") {
    return Response.json(
      {
        coverage: {
          generated_at: "2026-09-05T00:00:00.000Z",
          total_target: 20000,
          total_current: 0,
          overall_percentage: 0,
          domains: [],
          by_tier: {},
        },
      },
      { status: 200 },
    );
  }

  if (pathname === "/api/question-bank/questions" || pathname.includes("/question-bank/questions")) {
    return Response.json(
      {
        questions: [],
        total: 0,
      },
      { status: 200 },
    );
  }

  if (pathname === "/api/channels") {
    return Response.json({ channels: [] }, { status: 200 });
  }

  if (pathname === "/api/tasks") {
    return Response.json({ tasks: [], codex_status: "connected" }, { status: 200 });
  }

  if (pathname === "/api/storage") {
    return Response.json(
      {
        path: "D:/Studio",
        default_path: "D:/Studio",
        channel_path: "D:/Studio/channels",
        configured: true,
      },
      { status: 200 },
    );
  }

  if (pathname === "/api/voices") {
    return Response.json({ voices: [] }, { status: 200 });
  }

  if (pathname === "/api/mascots") {
    return Response.json({ mascots: [] }, { status: 200 });
  }

  if (pathname === "/api/git") {
    return Response.json({ branch: "main", dirty: false, changed_files: 0 }, { status: 200 });
  }

  if (pathname === "/api/analytics/usage-ledger" || pathname === "/api/analytics/reconcile") {
    return Response.json({ entries: [], total_cost: 0 }, { status: 200 });
  }

  if (pathname.startsWith("/api/quiz/sfx/")) {
    return new Response(new ArrayBuffer(0), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });
  }

  return Response.json({ error: "Endpoint not mocked in test environment" }, { status: 404 });
}

const mockFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const urlString = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let pathname = urlString;
  try {
    if (urlString.startsWith("http://") || urlString.startsWith("https://")) {
      pathname = new URL(urlString).pathname;
    } else {
      pathname = urlString.split("?")[0] || "";
    }
  } catch {
    pathname = urlString;
  }

  if (pathname.startsWith("/api/")) {
    return getMockApiResponse(pathname);
  }

  if (typeof originalFetch === "function") {
    try {
      return await originalFetch(input, init);
    } catch {
      return Response.json({}, { status: 200 });
    }
  }

  return Response.json({}, { status: 200 });
};

vi.stubGlobal("fetch", mockFetch);
if (typeof window !== "undefined") {
  window.fetch = mockFetch;
}
