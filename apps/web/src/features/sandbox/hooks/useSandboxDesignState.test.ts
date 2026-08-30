import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSandboxDesignState } from "./useSandboxDesignState";

describe("useSandboxDesignState", () => {
  it("initializes with default candy_arcade theme and design properties", () => {
    const { result } = renderHook(() => useSandboxDesignState());
    expect(result.current.theme).toBe("candy_arcade");
    expect(result.current.paletteId).toBe("lime");
    expect(result.current.layoutId).toBe("media_left_choices_right");
    expect(result.current.thinkingBarStyle).toBe("star_slider");
    expect(result.current.questionBoxStyle).toBe("candy_pop");
    expect(result.current.answerCardStyle).toBe("glossy_arcade");
    expect(result.current.counterStyle).toBe("hanging_woodsign");
  });

  it("updates individual design properties", () => {
    const { result } = renderHook(() => useSandboxDesignState());

    act(() => {
      result.current.setPaletteId("grape");
      result.current.setLayoutId("visual_choices_three");
      result.current.setThinkingBarStyle("cosmic_rocket");
      result.current.setQuestionBoxStyle("comic_bubble");
      result.current.setAnswerCardStyle("comic_chunky");
      result.current.setCounterStyle("neon_badge");
    });

    expect(result.current.paletteId).toBe("grape");
    expect(result.current.layoutId).toBe("visual_choices_three");
    expect(result.current.thinkingBarStyle).toBe("cosmic_rocket");
    expect(result.current.questionBoxStyle).toBe("comic_bubble");
    expect(result.current.answerCardStyle).toBe("comic_chunky");
    expect(result.current.counterStyle).toBe("neon_badge");
  });
});
