import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RepositoryService } from "../src/repository.js";

const roots: string[] = [];

async function createTestRepository(): Promise<RepositoryService> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reel-usage-ledger-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  const repo = new RepositoryService(root);
  await repo.ensureBootstrap();
  return repo;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
});

describe("Short-Reel Usage Accounting & Ledger Boundary (Phase 02 / I08)", () => {
  it("records legacy episode image usage with episode_id and no reel_id", async () => {
    const repository = await createTestRepository();

    await repository.recordImageUsage({
      channelId: "ch_nature_01",
      episodeId: "ep_volcano_01",
      provider: "gpti2",
      model: "gpt-image-2",
      count: 1,
    });

    const ledger = await repository.readUsageLedger();
    expect(ledger.image.total_images_generated).toBe(1);
    expect(ledger.recent_events.length).toBe(1);

    const event = ledger.recent_events[0];
    expect(event.channel_id).toBe("ch_nature_01");
    expect(event.episode_id).toBe("ep_volcano_01");
    expect(event.reel_id).toBeUndefined();
    // When cost is not supplied, it is marked as estimated and does not claim measured cost
    expect(event.details.cost_estimated).toBe(true);
    expect(event.details.measured_cost).toBeUndefined();
  });

  it("records Short-Reel image usage with reel_id and no episode_id (no fabricated episode)", async () => {
    const repository = await createTestRepository();

    await repository.recordImageUsage({
      channelId: "ch_nature_01",
      reelId: "sreel_predators_999",
      provider: "gpti2",
      model: "gpt-image-2",
      count: 1,
      costVnd: 50,
      note: "Short-Reel style generation",
    });

    const ledger = await repository.readUsageLedger();
    expect(ledger.image.total_images_generated).toBe(1);
    expect(ledger.recent_events.length).toBe(1);

    const event = ledger.recent_events[0];
    expect(event.channel_id).toBe("ch_nature_01");
    expect(event.reel_id).toBe("sreel_predators_999");
    expect(event.episode_id).toBeUndefined(); // Zero fabricated episode ID
    expect(event.details.cost_estimated).toBe(false);
    expect(event.details.measured_cost).toBe(50);
    expect(event.details.cost_vnd).toBe(50);
  });

  it("accumulates totals accurately across both episode and reel events", async () => {
    const repository = await createTestRepository();

    // 1. Episode generation
    await repository.recordImageUsage({
      channelId: "ch_1",
      episodeId: "ep_1",
      provider: "gpti2",
      model: "gpt-image-2",
      count: 2,
    });

    // 2. Reel generation
    await repository.recordImageUsage({
      channelId: "ch_1",
      reelId: "sreel_1",
      provider: "gpti2",
      model: "gpt-image-2",
      count: 1,
      costVnd: 50,
    });

    const ledger = await repository.readUsageLedger();
    expect(ledger.image.total_images_generated).toBe(3);
    expect(ledger.image.by_provider.gpti2).toBe(3);
    expect(ledger.recent_events.length).toBe(2);

    const [reelEvt, episodeEvt] = ledger.recent_events;
    expect(reelEvt.reel_id).toBe("sreel_1");
    expect(reelEvt.episode_id).toBeUndefined();

    expect(episodeEvt.episode_id).toBe("ep_1");
    expect(episodeEvt.reel_id).toBeUndefined();
  });
});
