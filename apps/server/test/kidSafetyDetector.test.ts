import { describe, expect, it } from "vitest";
import {
  detectKidSafetyIssue,
  findKidUnsafeTerm,
  findMatureFranchise,
  isKidSafeEntity,
} from "../src/quiz/bank/kidSafety/kidSafetyDetector.js";
import { screenKnowledgeEntityForKids } from "../src/quiz/bank/kidSafety/kidSafeKnowledgeEntity.js";
import type { KnowledgeEntity } from "../src/quiz/bank/knowledgeBase.types.js";

const safeQuestion = {
  question: "Which animal is the largest in the ocean?",
  choices: [{ text: "Blue Whale" }, { text: "Great White Shark" }, { text: "Giant Squid" }],
  explanation: "The blue whale is the biggest animal that has ever lived.",
  fun_fact: "Its heart is as big as a small car!",
};

describe("kid safety detector", () => {
  it("passes ordinary kids and family trivia", () => {
    expect(detectKidSafetyIssue(safeQuestion)).toBeNull();
  });

  it("flags teen- and adult-rated franchises on screen or in narration", () => {
    expect(detectKidSafetyIssue({ ...safeQuestion, question: "In Death Note, who finds the notebook?" })).toMatchObject({
      category: "mature_franchise",
      term: "Death Note",
      field: "question",
    });
    expect(detectKidSafetyIssue({ ...safeQuestion, fun_fact: "Kratos first appeared in God of War." })).toMatchObject({
      category: "mature_franchise",
      field: "fun_fact",
    });
  });

  it("flags alcohol, gambling, drugs, graphic violence, horror, and sexual content", () => {
    expect(findKidUnsafeTerm("Drinking a Bloody Mary cures a hangover")?.category).toBe("alcohol");
    expect(findKidUnsafeTerm("The pirates got drunk on the island")?.category).toBe("alcohol");
    expect(findKidUnsafeTerm("Poker and roulette fill every casino")?.category).toBe("gambling");
    expect(findKidUnsafeTerm("He built an illegal meth empire")?.category).toBe("tobacco_drugs");
    expect(findKidUnsafeTerm("Hundreds of prisoners were beheaded")?.category).toBe("graphic_violence");
    expect(findKidUnsafeTerm("The actress leaped to her death from the sign")?.category).toBe("graphic_violence");
    expect(findKidUnsafeTerm("He sought the stones to wipe out half of all life.")?.category).toBe("graphic_violence");
    expect(findKidUnsafeTerm("A good rain can wipe out all the dust on the car.")).toBeNull();
    expect(findKidUnsafeTerm("A slasher film full of zombies")?.category).toBe("horror");
    expect(findKidUnsafeTerm("The brand pioneered the lubricated condom")?.category).toBe("sexual_content");
  });

  it("ignores harmless phrases that contain a flagged word", () => {
    expect(findKidUnsafeTerm("Root beer has no alcohol at all")).toBeNull();
    expect(findKidUnsafeTerm("She set a Guinness World Record")).toBeNull();
    expect(findKidUnsafeTerm("Hand sanitizer uses isopropyl alcohol to kill germs")).toBeNull();
    expect(findKidUnsafeTerm("Ares was the Greek god of war")).toBeNull();
    expect(findKidUnsafeTerm("A solar halo circles the Sun")).toBeNull();
    expect(findKidUnsafeTerm("Naked mole rats live underground")).toBeNull();
    expect(findKidUnsafeTerm("Hercules possessed incredible strength")).toBeNull();
    expect(findKidUnsafeTerm("Black tea is drunk all over China")).toBeNull();
  });

  it("allows passing mentions of wine in narration but not as the on-screen subject", () => {
    const fondue = { ...safeQuestion, explanation: "Fondue melts cheese with a splash of white wine." };
    expect(detectKidSafetyIssue(fondue)).toBeNull();
    expect(detectKidSafetyIssue({ ...safeQuestion, question: "Which grape makes the most famous red wine?" })).toMatchObject({
      category: "alcohol",
      field: "question",
    });
  });

  it("reports the franchise a text belongs to", () => {
    expect(findMatureFranchise("Master Chief fights the Covenant in Halo")).toBe("Halo");
    expect(findMatureFranchise("Pikachu uses Thunderbolt")).toBeNull();
  });
});

function makeEntity(overrides: Partial<KnowledgeEntity> = {}): KnowledgeEntity {
  return {
    id: "ENT-TEST-001",
    domain_id: "mythology_creatures",
    subtopic_id: "greek_myths",
    name: "Medusa",
    language: "en",
    visual_anchor: "A gorgon with snakes for hair on a Greek island.",
    core_traits: ["Has living snakes instead of hair", "Turns onlookers to stone"],
    facts_and_myths: [{ claim: "Medusa had snakes for hair.", verdict: "fact", explanation: "Greek myths describe her snake hair." }],
    ...overrides,
  };
}

describe("kid-safe Knowledge Base entities", () => {
  it("keeps ordinary subjects even when one clue is unsuitable, stripping that clue", () => {
    const entity = makeEntity({ core_traits: ["Has living snakes instead of hair", "Was beheaded by Perseus"] });
    expect(isKidSafeEntity(entity)).toBe(true);
    expect(screenKnowledgeEntityForKids(entity)?.core_traits).toEqual(["Has living snakes instead of hair"]);
  });

  it("drops subjects whose name is unsuitable or that belong to a mature franchise", () => {
    expect(screenKnowledgeEntityForKids(makeEntity({ name: "Bloody Mary" }))).toBeNull();
    expect(
      screenKnowledgeEntityForKids(makeEntity({ name: "Tanjiro Kamado", core_traits: ["Kind-hearted Demon Slayer swordsman"] })),
    ).toBeNull();
  });

  it("keeps epithets such as the god of war on mythology subjects", () => {
    expect(isKidSafeEntity(makeEntity({ name: "Ares", aliases: ["God of War"] }))).toBe(true);
  });

  it("drops a subject rather than leaving it with no usable facts", () => {
    const entity = makeEntity({
      facts_and_myths: [{ claim: "Perseus beheaded Medusa.", verdict: "fact", explanation: "He used a mirror shield." }],
    });
    expect(screenKnowledgeEntityForKids(entity)).toBeNull();
  });
});
