import { describe, expect, it } from "vitest";
import { TaskTypeSchema } from "@studio/shared";

describe("Quiz-only task contracts", () => {
  it("rejects the retired master narration task type", () => {
    const retiredTaskType = ["GENERATE_", "NARRATION"].join("");
    expect(TaskTypeSchema.safeParse(retiredTaskType).success).toBe(false);
  });
});
