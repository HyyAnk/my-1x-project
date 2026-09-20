import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n";
import { MascotGeneratorTab } from "./MascotGeneratorTab";
import type { useMascotGenerator } from "./hooks/useMascotGenerator";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

vi.mock("./hooks/useMascotStyles", () => ({
  useMascotStyles: () => ({
    styleQueueProgress: {
      total: 1,
      completed: 0,
      failed: 0,
      activeStyleIds: ["builtin_cyber_neon"],
      activeStyleNames: ["Cyber Neon Pulse"],
      statusMessage: "Generating Cyber Neon Pulse",
      isStopping: false,
      startTime: 1,
    },
    handleStopStyleQueue: vi.fn(),
    handleRetryFailedStyles: vi.fn(),
    activeStyleId: "core",
    batchProgress: null,
    setActiveStyleId: vi.fn(),
  }),
}));

vi.mock("./hooks/activity", () => ({
  useMascotStudioActivity: () => ({
    activities: [
      {
        id: "style-concepts:batch-1",
        kind: "style_concepts",
        status: "running",
        isActive: true,
        completed: 0,
        failed: 0,
        total: 1,
        percentage: 0,
        updatedAt: "2026-09-20T00:00:00.000Z",
      },
    ],
    warnings: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    refresh: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("./components/MascotGeneratorStepperHeader", () => ({
  MascotGeneratorStepperHeader: () => <div data-testid="stepper" />,
}));

vi.mock("./components/MascotConceptStep", () => ({
  MascotConceptStep: () => <div data-testid="concept-step" />,
}));

vi.mock("./components/MascotActionsStep", () => ({
  MascotActionsStep: () => <div data-testid="actions-step" />,
}));

vi.mock("./components/MascotAnimationProcessingStep", () => ({
  MascotAnimationProcessingStep: () => <div data-testid="processing-step" />,
}));

vi.mock("./components/MascotStudioActivityPanel", () => ({
  MascotStudioActivityPanel: ({ activities }: { activities: unknown[] }) =>
    activities.length > 0 ? <div data-testid="background-activity" /> : null,
}));

function createGeneratorState(generatorStep: 1 | 2 | 3 | 4) {
  return {
    generatorStep,
    setGeneratorStep: vi.fn(),
    editingMascot: null,
    setEditingMascot: vi.fn(),
  } as unknown as ReturnType<typeof useMascotGenerator>;
}

afterEach(() => {
  cleanup();
});

describe("MascotGeneratorTab", () => {
  it("keeps style generation activity visible outside the concept step", () => {
    render(<MascotGeneratorTab generatorState={createGeneratorState(2)} />, { wrapper });

    expect(screen.getByTestId("actions-step")).toBeTruthy();
    expect(screen.getByTestId("background-activity")).toBeTruthy();
  });

  it("leaves queue progress rendering to the concept step on step one", () => {
    render(<MascotGeneratorTab generatorState={createGeneratorState(1)} />, { wrapper });

    expect(screen.getByTestId("concept-step")).toBeTruthy();
    expect(screen.queryByTestId("background-activity")).toBeNull();
  });
});
