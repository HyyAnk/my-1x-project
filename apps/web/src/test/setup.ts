import { vi } from "vitest";

class ResizeObserverMock {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
