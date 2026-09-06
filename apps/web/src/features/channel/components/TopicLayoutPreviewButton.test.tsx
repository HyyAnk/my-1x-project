import { describe, expect, it, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { TopicLayoutPreviewButton } from "./TopicLayoutPreviewButton";

describe("TopicLayoutPreviewButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders default Deep Trivia layout badge and popover wireframe", () => {
    const { getByRole, getByText } = render(
      <TopicLayoutPreviewButton quizFormat="multiple_choice" />,
    );

    const button = getByRole("button", { name: /Layout: Deep Trivia/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/media_left_choices_right/)).toBeDefined();
    expect(getByText(/HERO IMAGE \(580px\)/)).toBeDefined();
    expect(getByText(/Multiple Choice \/ Knowledge/)).toBeDefined();
  });

  it("resolves and renders Clue Deduction layout when archetype is clue_deduction", () => {
    const { getByRole, getByText } = render(
      <TopicLayoutPreviewButton quizFormat="image_guess" archetype="clue_deduction" />,
    );

    const button = getByRole("button", { name: /Layout: Clue Deduction/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/clue_deduction/)).toBeDefined();
    expect(getByText(/CLUE 100% CLEAR/)).toBeDefined();
    expect(getByText(/REVEAL DOCK/)).toBeDefined();
    expect(getByText(/1 clue image A \+ 1 answer image B/)).toBeDefined();
  });

  it("resolves and renders Mystery Reveal layout when archetype is mystery_reveal", () => {
    const { getByRole, getByText } = render(
      <TopicLayoutPreviewButton quizFormat="image_guess" archetype="mystery_reveal" />,
    );

    const button = getByRole("button", { name: /Layout: Mystery Reveal/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/mystery_reveal/)).toBeDefined();
    expect(getByText(/Answer Reveal Bar/)).toBeDefined();
    expect(getByText(/1 subject image on clean background \(auto-pixelated\)/)).toBeDefined();
  });

  it("resolves layout directly when layoutId is specified", () => {
    const { getByRole, getByText, getAllByText } = render(
      <TopicLayoutPreviewButton quizFormat="multiple_choice" layoutId="split_versus_two" />,
    );

    const button = getByRole("button", { name: /Layout: Split Versus/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/split_versus_two/)).toBeDefined();
    expect(getAllByText(/VS/).length).toBeGreaterThanOrEqual(1);
    expect(getByText(/Option A/)).toBeDefined();
    expect(getByText(/Option B/)).toBeDefined();
  });

  it("resolves Speed Blitz / full_stack_list when archetype is speed_blitz", () => {
    const { getByRole, getByText } = render(
      <TopicLayoutPreviewButton quizFormat="multiple_choice" archetype="speed_blitz" />,
    );

    const button = getByRole("button", { name: /Layout: Speed Blitz/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/full_stack_list/)).toBeDefined();
    expect(getByText(/Choice D/)).toBeDefined();
  });

  it("resolves Visual Spotting / visual_choices_three_pure when archetype is visual_spotting", () => {
    const { getByRole, getByText } = render(
      <TopicLayoutPreviewButton quizFormat="odd_one_out" archetype="visual_spotting" />,
    );

    const button = getByRole("button", { name: /Layout: 3 Visual Pure/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/visual_choices_three_pure/)).toBeDefined();
    expect(getByText(/Visual A/)).toBeDefined();
  });

  it("resolves True or False / verdict_true_false when quizFormat is true_false", () => {
    const { getByRole, getByText, getAllByText } = render(
      <TopicLayoutPreviewButton quizFormat="true_false" />,
    );

    const button = getByRole("button", { name: /Layout: True or False/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/verdict_true_false/)).toBeDefined();
    expect(getAllByText(/TRUE/).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/FALSE/).length).toBeGreaterThanOrEqual(1);
  });

  it("resolves Portrait Hero Choices when aspectRatio is 9:16 for default multiple choice", () => {
    const { getByRole, getByText } = render(
      <TopicLayoutPreviewButton quizFormat="multiple_choice" aspectRatio="9:16" />,
    );

    const button = getByRole("button", { name: /Layout: Portrait Hero Choices/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/portrait_hero_choices/)).toBeDefined();
    expect(getByText(/HERO IMAGE \(860×500\)/)).toBeDefined();
    expect(getByText(/Clears Right Action Rail/)).toBeDefined();
    expect(getByText(/440px Bottom Caption Safe Zone/)).toBeDefined();
    expect(getByText(/Multiple Choice \/ Knowledge \(9:16\)/)).toBeDefined();
  });

  it("resolves Portrait Split Versus when aspectRatio is 9:16 and archetype is versus_faceoff", () => {
    const { getByRole, getByText, getAllByText } = render(
      <TopicLayoutPreviewButton
        quizFormat="multiple_choice"
        archetype="versus_faceoff"
        aspectRatio="9:16"
      />,
    );

    const button = getByRole("button", { name: /Layout: Portrait Split Versus/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/portrait_split_versus/)).toBeDefined();
    expect(getByText(/Contender A \(Top\)/)).toBeDefined();
    expect(getByText(/Contender B \(Bottom\)/)).toBeDefined();
    expect(getAllByText(/VS/).length).toBeGreaterThanOrEqual(1);
    expect(getByText(/440px Bottom Caption Safe Zone/)).toBeDefined();
  });

  it("resolves Portrait True or False when aspectRatio is 9:16 and quizFormat is true_false", () => {
    const { getByRole, getByText, getAllByText } = render(
      <TopicLayoutPreviewButton quizFormat="true_false" aspectRatio="9:16" />,
    );

    const button = getByRole("button", { name: /Layout: Portrait True or False/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/portrait_verdict_tf/)).toBeDefined();
    expect(getByText(/HERO VISUAL \(860×540\)/)).toBeDefined();
    expect(getAllByText(/TRUE/).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/FALSE/).length).toBeGreaterThanOrEqual(1);
    expect(getByText(/440px Bottom Caption Safe Zone/)).toBeDefined();
  });

  it("resolves Portrait Stack List when aspectRatio is 9:16 and archetype is speed_blitz", () => {
    const { getByRole, getByText } = render(
      <TopicLayoutPreviewButton
        quizFormat="multiple_choice"
        archetype="speed_blitz"
        aspectRatio="9:16"
      />,
    );

    const button = getByRole("button", { name: /Layout: Portrait Stack List/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/portrait_stack_list/)).toBeDefined();
    expect(getByText(/Choice D/)).toBeDefined();
    expect(getByText(/Mascot Safe Anchor/)).toBeDefined();
    expect(getByText(/440px Bottom Caption Safe Zone/)).toBeDefined();
  });

  it("strictly disallows 3-image odd-one-out layouts in 9:16 and falls back to portrait_hero_choices", () => {
    const { getByRole, getByText } = render(
      <TopicLayoutPreviewButton
        quizFormat="odd_one_out"
        archetype="visual_spotting"
        layoutId="visual_choices_three_pure"
        aspectRatio="9:16"
      />,
    );

    const button = getByRole("button", { name: /Layout: Portrait Hero Choices/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(getByText(/portrait_hero_choices/)).toBeDefined();
    expect(getByText(/HERO IMAGE \(860×500\)/)).toBeDefined();
    expect(getByText(/440px Bottom Caption Safe Zone/)).toBeDefined();
  });
});
