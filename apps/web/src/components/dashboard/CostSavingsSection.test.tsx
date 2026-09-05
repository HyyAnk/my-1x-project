import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { UsageLedger } from "@studio/shared";
import { LanguageProvider } from "../../i18n";
import { CostSavingsSection } from "./CostSavingsSection";

describe("CostSavingsSection i18n & unit localization", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const sampleLedger: UsageLedger = {
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    voice: {
      rendered_characters: 25000,
      rendered_duration_seconds: 180,
      rendered_segments_count: 5,
      rendered_episodes_count: 1,
      estimated_savings_usd: 2.5,
    },
    image: {
      total_images_generated: 42,
      estimated_cost_vnd: 21000,
      estimated_cost_usd: 0.84,
      by_provider: { "GPT-Image-2": 42 },
      by_model: { "gpt-image-2": 42 },
    },
    recent_events: [],
  };

  it("renders English units and does not leak Vietnamese words when language is 'en'", () => {
    window.localStorage.setItem("studio-language", "en");

    render(
      <LanguageProvider>
        <CostSavingsSection
          voiceMetrics={{
            rendered_characters: 25000,
            rendered_duration_seconds: 180,
            rendered_segments_count: 5,
            rendered_episodes_count: 1,
          }}
          usageLedger={sampleLedger}
        />
      </LanguageProvider>,
    );

    // AI Images Produced should display 'images' in English, NOT 'ảnh'
    const imageCountMetric = screen.getByText(/42 images/i);
    expect(imageCountMetric).toBeDefined();
    expect(screen.queryByText(/42 ảnh/i)).toBeNull();

    // Rendered characters should display 'chars', NOT 'ký tự'
    expect(screen.getByText(/25,000 chars/i)).toBeDefined();
    expect(screen.queryByText(/ký tự/i)).toBeNull();

    // Audio produced should display 'mins', NOT 'phút'
    expect(screen.getByText(/3\.0 mins/i)).toBeDefined();
    expect(screen.queryByText(/phút/i)).toBeNull();

    // Card titles should be localized in English
    expect(screen.getByText("Voice TTS Savings")).toBeDefined();
    expect(screen.getByText("AI Image Spend")).toBeDefined();
  });

  it("renders singular 'image' when exactly 1 image is generated in English", () => {
    window.localStorage.setItem("studio-language", "en");

    const singleImageLedger: UsageLedger = {
      ...sampleLedger,
      image: {
        total_images_generated: 1,
        estimated_cost_vnd: 500,
        estimated_cost_usd: 0.02,
        by_provider: { "GPT-Image-2": 1 },
        by_model: { "gpt-image-2": 1 },
      },
    };

    render(
      <LanguageProvider>
        <CostSavingsSection usageLedger={singleImageLedger} />
      </LanguageProvider>,
    );

    expect(screen.getByText(/1 image/i)).toBeDefined();
    expect(screen.queryByText(/1 ảnh/i)).toBeNull();
  });

  it("coerces legacy 'vi' setting to English and renders pure English economics", () => {
    window.localStorage.setItem("studio-language", "vi");

    render(
      <LanguageProvider>
        <CostSavingsSection
          voiceMetrics={{
            rendered_characters: 25000,
            rendered_duration_seconds: 180,
            rendered_segments_count: 5,
            rendered_episodes_count: 1,
          }}
          usageLedger={sampleLedger}
        />
      </LanguageProvider>,
    );

    // AI Images Produced should display 'images' in English
    expect(screen.getAllByText(/42 images/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/ảnh/i)).toBeNull();

    // Rendered characters should display 'chars'
    expect(screen.getAllByText(/25,000 chars/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/ký tự/i)).toBeNull();

    // Audio produced should display 'mins'
    expect(screen.getAllByText(/3\.0 mins/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/phút/i)).toBeNull();

    // Card titles should be localized in English
    expect(screen.getAllByText("Voice TTS Savings").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI Image Spend").length).toBeGreaterThan(0);
  });
});
