import type React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { LanguageProvider } from "../../../../i18n";
import { SandboxDesignTab } from "../SandboxDesignTab";
import { BackgroundDropdown } from "../../../episode/components/customization/BackgroundDropdown";
import type { Channel, Episode } from "@studio/shared";

const renderWithLanguage = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe("Background Selector UI & Controls (P7-UI-01..04)", () => {
  afterEach(() => {
    cleanup();
  });

  it("P7-UI-01: SandboxDesignTab renders background variant options using scalable option section", () => {
    const setBackgroundStyle = vi.fn();
    const { getByRole, getByText } = renderWithLanguage(
      <SandboxDesignTab
        layoutId="media_left_choices_right"
        setLayoutId={vi.fn()}
        paletteId="lime"
        setPaletteId={vi.fn()}
        thinkingBarStyle="star_slider"
        setThinkingBarStyle={vi.fn()}
        questionBoxStyle="candy_pop"
        setQuestionBoxStyle={vi.fn()}
        answerCardStyle="glossy_arcade"
        setAnswerCardStyle={vi.fn()}
        counterStyle="hanging_woodsign"
        setCounterStyle={vi.fn()}
        backgroundStyle="candy_rays"
        setBackgroundStyle={setBackgroundStyle}
      />,
    );

    expect(getByText("7. Background Variant")).toBeDefined();
    const auroraOption = getByRole("button", { name: "7. Background Variant: Aurora Glow" });
    expect(auroraOption).toBeDefined();
    expect(auroraOption.getAttribute("aria-pressed")).toBe("false");
    expect(auroraOption.style.minHeight).toBe("44px");

    fireEvent.click(auroraOption);
    expect(setBackgroundStyle).toHaveBeenCalledWith("aurora_glow");
  });

  it("P7-UI-02 & P7-UI-03: Episode customization BackgroundDropdown supports preview hover and selection", () => {
    const channel = {
      channel_id: "ch_test",
      user_id: "u1",
      display_name: "Test Channel",
      slug: "test-channel",
      default_background_style: "candy_rays",
      default_palette_id: "lime",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Channel;
    const episode = {
      episode_id: "ep_test",
      channel_id: "ch_test",
      title: "Test Episode",
      status: "DRAFT",
      target_duration_minutes: 1,
      quiz_config: {
        background_style: "candy_rays",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Episode;

    const onSelectStyle = vi.fn();
    const onPreview = vi.fn();

    const { getByText } = renderWithLanguage(
      <BackgroundDropdown
        channel={channel}
        episode={episode}
        disabled={false}
        saving={false}
        isOpen={true}
        onToggle={vi.fn()}
        onSelectStyle={onSelectStyle}
        onPreview={onPreview}
      />,
    );

    expect(getByText("Background")).toBeDefined();

    const auroraOption = getByText("Aurora Glow");
    fireEvent.click(auroraOption);
    expect(onSelectStyle).toHaveBeenCalledWith("aurora_glow");
  });
});
