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

  it("Step 3: Web Preview Player renders the new transition overlay with appropriate CSS classes and variables", () => {
    registerTransition(sampleNewTransition);

    const { container } = render(
      React.createElement(TransitionPreviewPlayer, {
        transitionType: "curtain_wipe",
        durationSeconds: 0.6,
        aspectRatio: "16:9",
        progress: 0.5,
      }),
    );

    const overlay = container.querySelector(".transition-curtain-wipe");
    expect(overlay).not.toBeNull();
    expect(container.querySelector(".intro-transition")).not.toBeNull();
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
});
