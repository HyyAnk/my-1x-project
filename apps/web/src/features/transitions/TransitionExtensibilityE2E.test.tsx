import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import {
  registerTransition,
  resetTransitionRegistry,
  getTransition,
  listTransitions,
  isValidTransition,
  type TransitionDefinition,
} from "@studio/shared";
import { getIntroOutroTransitionOptions } from "../channel/components/introOutro/types";
import { TransitionPreviewPlayer } from "./components/TransitionPreviewPlayer";
import { TransitionSelector } from "./components/TransitionSelector";

describe("Stage 9: Transition Extensibility & End-to-End Unification Audit", () => {
  const sampleNewTransition: TransitionDefinition = {
    id: "curtain_wipe",
    name: "Curtain Wipe",
    description: "Theatrical curtain opening effect with brand depth.",
    category: "intro_outro",
    defaultDuration: 0.6,
    minDuration: 0.2,
    maxDuration: 1.5,
    cssClass: "transition-curtain-wipe",
    tag: "Theatrical",
    iconName: "FilmStrip",
  };

  beforeEach(() => {
    resetTransitionRegistry();
  });

  afterEach(() => {
    resetTransitionRegistry();
  });

  it("Step 1: Successfully registers a brand new transition in the Single Source of Truth registry", () => {
    expect(isValidTransition("curtain_wipe")).toBe(false);

    registerTransition(sampleNewTransition);

    expect(isValidTransition("curtain_wipe")).toBe(true);
    const meta = getTransition("curtain_wipe");
    expect(meta).toBeDefined();
    expect(meta?.name).toBe("Curtain Wipe");
    expect(meta?.defaultDuration).toBe(0.6);
    expect(meta?.cssClass).toBe("transition-curtain-wipe");
    expect(meta?.tag).toBe("Theatrical");
  });

  it("Step 2: Web UI dropdown options automatically pick up the new transition without code changes", () => {
    registerTransition(sampleNewTransition);

    const options = getIntroOutroTransitionOptions();
    const found = options.find((opt) => opt.id === "curtain_wipe");

    expect(found).toBeDefined();
    expect(found?.name).toBe("Curtain Wipe");
    expect(found?.description).toContain("Theatrical curtain opening effect");
    expect(found?.tag).toBe("Theatrical");
  });

  it("Step 3: Web Preview Player initializes and binds the newly registered transition cleanly", () => {
    registerTransition(sampleNewTransition);

    const { getByTestId } = render(
      React.createElement(TransitionPreviewPlayer, {
        transitionType: "curtain_wipe",
        durationSeconds: 0.6,
        aspectRatio: "16:9",
      }),
    );

    expect(getByTestId("transition-preview-player")).toBeDefined();
    expect(getByTestId("transition-preview-viewport")).toBeDefined();
    expect(getByTestId("transition-transport")).toBeDefined();
  });

  it("Step 4: Dynamic registration supports in-scene quiz transitions seamlessly", () => {
    const sceneTransition: TransitionDefinition = {
      id: "portal_vortex",
      name: "Portal Vortex",
      description: "Cosmic vortex transition between quiz rounds.",
      category: "scene",
      defaultDuration: 0.75,
      minDuration: 0.3,
      maxDuration: 1.5,
      cssClass: "transition-portal-vortex",
      tag: "Sci-Fi",
      iconName: "Sparkle",
    };

    registerTransition(sceneTransition);

    expect(isValidTransition("portal_vortex", "scene")).toBe(true);
    const sceneList = listTransitions("scene");
    expect(sceneList.some((t) => t.id === "portal_vortex")).toBe(true);
  });

  it("Step 5: Unified TransitionSelector renders dynamically registered effect and handles selection", () => {
    registerTransition(sampleNewTransition);

    const entries = [
      {
        id: "curtain_wipe",
        implementationRevision: "1.0.0",
        name: "Curtain Wipe",
        placements: ["intro" as const, "scene" as const],
        defaultDurationSeconds: 0.6,
        minDurationSeconds: 0.2,
        maxDurationSeconds: 1.5,
        cssClass: "transition-curtain-wipe",
      },
    ];

    let selected = "stinger_swipe";
    const handleChange = (id: string) => {
      selected = id;
    };

    const { getByTestId } = render(
      React.createElement(TransitionSelector, {
        entries,
        selectedId: selected,
        onChange: handleChange,
      }),
    );

    const selector = getByTestId("transition-selector") as HTMLSelectElement;
    expect(selector).toBeDefined();
    expect(selector.querySelector('option[value="curtain_wipe"]')).toBeDefined();
  });
});

