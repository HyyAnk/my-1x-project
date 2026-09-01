import { describe, expect, it } from "vitest";
import { ChannelSchema, CreateChannelInputSchema } from "@studio/shared";

const createInput = {
  name: "Brain Bites",
  description: "Fast family quizzes",
  target_audience: "Families",
  language: "English",
  country: "AU",
  market: "AU",
  dna_mode: "ai" as const,
};

describe("Quiz-only channel contracts", () => {
  it("rejects stale discriminator fields at the create boundary", () => {
    expect(CreateChannelInputSchema.safeParse({ ...createInput, group_id: "quiz" }).success).toBe(false);
    expect(CreateChannelInputSchema.safeParse({ ...createInput, engine: "quiz" }).success).toBe(false);
  });

  it("rejects discriminator fields in persisted channel metadata", () => {
    const channel = {
      channel_id: "ch_1",
      slug: "brain-bites",
      display_name: "Brain Bites",
      channel_dna_path: "channels/brain-bites/channel_dna.md",
      status: "DRAFT",
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
      group_id: "quiz",
      engine: "quiz",
    };

    expect(ChannelSchema.safeParse(channel).success).toBe(false);
  });
});
