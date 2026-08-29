import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSandboxQuestionState } from "./useSandboxQuestionState";

describe("useSandboxQuestionState", () => {
  it("initializes with English sample questions by default", () => {
    const { result } = renderHook(() => useSandboxQuestionState("en"));
    expect(result.current.questionText).toContain("Which planet in our solar system");
    expect(result.current.choices).toEqual(["Jupiter", "Saturn", "Uranus"]);
    expect(result.current.correctChoiceIndex).toBe(1);
    expect(result.current.factCardTitle).toBe("DID YOU KNOW?");
    expect(result.current.questionNumber).toBe(1);
    expect(result.current.totalQuestions).toBe(10);
  });

  it("initializes with Vietnamese sample questions when language is vi", () => {
    const { result } = renderHook(() => useSandboxQuestionState("vi"));
    expect(result.current.questionText).toContain("Hành tinh nào trong hệ Mặt Trời");
    expect(result.current.choices).toEqual(["Sao Mộc", "Sao Thổ", "Sao Thiên Vương"]);
    expect(result.current.correctChoiceIndex).toBe(1);
    expect(result.current.factCardTitle).toBe("BẠN CÓ BIẾT?");
  });

  it("updates question text, choices, and correct choice index", () => {
    const { result } = renderHook(() => useSandboxQuestionState("en"));

    act(() => {
      result.current.setQuestionText("What is the largest mammal?");
      result.current.setChoices(["Elephant", "Blue Whale", "Giraffe"]);
      result.current.setCorrectChoiceIndex(1);
      result.current.setFactCardText("Blue whales can grow up to 30 meters!");
    });

    expect(result.current.questionText).toBe("What is the largest mammal?");
    expect(result.current.choices).toEqual(["Elephant", "Blue Whale", "Giraffe"]);
    expect(result.current.correctChoiceIndex).toBe(1);
    expect(result.current.factCardText).toBe("Blue whales can grow up to 30 meters!");
  });

  it("applies a preset sample question correctly", () => {
    const { result } = renderHook(() => useSandboxQuestionState("en"));
    const shortQuestion = result.current.sampleQuestions[1];

    act(() => {
      result.current.handleApplyPresetQuestion(shortQuestion);
    });

    expect(result.current.questionText).toBe("What is the capital of France?");
    expect(result.current.choices).toEqual(["Rome", "Berlin", "Paris"]);
    expect(result.current.correctChoiceIndex).toBe(2);
    expect(result.current.factCardText).toContain("Lutetia");
  });
});
