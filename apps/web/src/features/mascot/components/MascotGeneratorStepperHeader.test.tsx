import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MascotProfile } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { MascotGeneratorStepperHeader } from "./MascotGeneratorStepperHeader";

afterEach(() => {
  cleanup();
});

describe("MascotGeneratorStepperHeader", () => {
  it("renders steps and disables subsequent steps when hasMasterImage is false", () => {
    const onSelectStep = vi.fn();
    render(
      <LanguageProvider>
        <MascotGeneratorStepperHeader
          generatorStep={1}
          onSelectStep={onSelectStep}
          hasMasterImage={false}
          busyAction={null}
          overallProgress={0}
          generationElapsed={0}
          currentStageMessage=""
        />
      </LanguageProvider>,
    );

    const step1Btn = screen.getByRole("button", { name: /1/i });
    const step2Btn = screen.getByRole("button", { name: /2/i });
    const step3Btn = screen.getByRole("button", { name: /3/i });
    const step4Btn = screen.getByRole("button", { name: /4/i });

    expect(step1Btn).toBeTruthy();
    expect(step2Btn.hasAttribute("disabled")).toBe(true);
    expect(step3Btn.hasAttribute("disabled")).toBe(true);
    expect(step4Btn.hasAttribute("disabled")).toBe(true);

    fireEvent.click(step1Btn);
    expect(onSelectStep).toHaveBeenCalledWith(1);
  });

  it("enables subsequent steps and handles step navigation when hasMasterImage is true", () => {
    const onSelectStep = vi.fn();
    render(
      <LanguageProvider>
        <MascotGeneratorStepperHeader
          generatorStep={2}
          onSelectStep={onSelectStep}
          hasMasterImage={true}
          busyAction={null}
          overallProgress={0}
          generationElapsed={0}
          currentStageMessage=""
        />
      </LanguageProvider>,
    );

    const step2Btn = screen.getByRole("button", { name: /2/i });
    const step3Btn = screen.getByRole("button", { name: /3/i });
    const step4Btn = screen.getByRole("button", { name: /4/i });

    expect(step2Btn.hasAttribute("disabled")).toBe(false);
    expect(step3Btn.hasAttribute("disabled")).toBe(false);
    expect(step4Btn.hasAttribute("disabled")).toBe(false);

    fireEvent.click(step3Btn);
    expect(onSelectStep).toHaveBeenCalledWith(3);

    fireEvent.click(step4Btn);
    expect(onSelectStep).toHaveBeenCalledWith(4);
  });

  it("renders global generator progress banner when busyAction is active", () => {
    render(
      <LanguageProvider>
        <MascotGeneratorStepperHeader
          generatorStep={1}
          onSelectStep={vi.fn()}
          hasMasterImage={false}
          busyAction="concept"
          overallProgress={45}
          generationElapsed={12}
          currentStageMessage="Synthesizing mascot artwork..."
        />
      </LanguageProvider>,
    );

    const progressBanner = screen.getByRole("progressbar");
    expect(progressBanner.getAttribute("aria-valuenow")).toBe("45");
    expect(screen.getByText("12s")).toBeTruthy();
    expect(screen.getByText("45%")).toBeTruthy();
    expect(screen.getByText("Synthesizing mascot artwork...")).toBeTruthy();
  });

  it("unlocks Step 2 and Step 3 when editingMascot has uploaded concept image", () => {
    const onSelectStep = vi.fn();
    const uploadedMascot: MascotProfile = {
      id: "uploaded_mascot",
      name: "Uploaded Mascot",
      description: "Uploaded description",
      master_prompt: "",
      concept_origin: "user_uploaded",
      master_image_url: "/uploads/uploaded_cutout.png",
      styles: [],
      visual_style: "pixar_3d",
      color_theme: "#06b6d4",
      actions: {},
      assigned_channel_ids: [],
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    };

    render(
      <LanguageProvider>
        <MascotGeneratorStepperHeader
          generatorStep={1}
          onSelectStep={onSelectStep}
          editingMascot={uploadedMascot}
          busyAction={null}
          overallProgress={0}
          generationElapsed={0}
          currentStageMessage=""
        />
      </LanguageProvider>,
    );

    const step2Btn = screen.getByRole("button", { name: /2/i });
    const step3Btn = screen.getByRole("button", { name: /3/i });

    expect(step2Btn.hasAttribute("disabled")).toBe(false);
    expect(step3Btn.hasAttribute("disabled")).toBe(false);

    fireEvent.click(step2Btn);
    expect(onSelectStep).toHaveBeenCalledWith(2);
  });
});
