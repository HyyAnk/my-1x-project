import { expect, it } from "vitest";
import { repairFixture } from "./helpers/shortReelRepairFixture.js";
import { ContextEngine } from "../src/context.js";
import { StudioLogger } from "../src/logger.js";
import { getAssignedTopicMatrixPlan } from "../src/context/channelContextBuilder.js";
import { parseTopicCandidates } from "../src/tasks/parsers.js";

it("keeps the prompt's assigned plan immutable across later consumers", async () => {
  const fixture = await repairFixture();
  try {
    const manifest = await new ContextEngine(fixture.repo, new StudioLogger(fixture.root)).build(
      "SUGGEST_TOPICS",
      fixture.channel.channel_id,
      null,
      undefined,
      0,
      "Speed",
    );
    const plan = getAssignedTopicMatrixPlan(manifest)!;
    expect(plan).toBeDefined();
    const assignedDomain = plan.slots[0].domainId;
    expect(() => {
      plan.slots[0].domainId = "forged-domain";
    }).toThrow();
    const output = plan.slots.map((slot, i) => ({
      topic_id: `candidate-${i}`,
      title: `Speed ${i}`,
      premise: "Compare speeds",
      hook: "Which is faster?",
      why_it_fits: "A speed comparison",
      estimated_potential: "High",
      domain_id: slot.domainId,
      content_kind: slot.contentKind,
      archetype: slot.archetype,
    }));
    expect(parseTopicCandidates(JSON.stringify(output), fixture.channel.channel_id, plan)[0].domain_id).toBe(assignedDomain);
    output[0].domain_id = "forged-domain";
    expect(() => parseTopicCandidates(JSON.stringify(output), fixture.channel.channel_id, plan)).toThrow(/domain_id/);
  } finally {
    await fixture.cleanup();
  }
});
