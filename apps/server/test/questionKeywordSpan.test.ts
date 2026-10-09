import { describe, expect, it } from "vitest";
import { highlightQuestionMarkup } from "../src/quiz/render/candyArcade/candyArcadeSvg.js";

function highlighted(question: string, opportunity: string): string | null {
  const match = highlightQuestionMarkup(question, opportunity).match(/<strong class="keyword-highlight">(.*?)<\/strong>/);
  return match ? match[1] : null;
}

describe("question keyword highlight title spans", () => {
  it.each([
    ["In Spy x Family, who is this secret agent?", "Loid Forger from Spy x Family in a green suit", "Spy x Family"],
    ["In Dragon Ball Z, who invented the Dragon Radar?", "Bulma from Dragon Ball Z holding the radar", "Dragon Ball Z"],
    ["In My Hero Academia, who is the smart principal?", "Principal Nezu from My Hero Academia", "My Hero Academia"],
    ["In Dr. Stone, who is this genius scientist?", "Senku from Dr. Stone in a lab", "Dr. Stone"],
    ["In Yu-Gi-Oh!, which mastermind built KaibaCorp?", "Seto Kaiba from Yu-Gi-Oh! near KaibaCorp tower", "Yu-Gi-Oh!"],
    ["In Steins;Gate, who is the eccentric lab scientist?", "Okabe from Steins;Gate in a lab coat", "Steins;Gate"],
    ["In Lupin the 3rd, who is the trenchcoat inspector?", "Zenigata from Lupin the 3rd in a trenchcoat", "Lupin the 3rd"],
    ["In Hunter x Hunter, which strategist uses chains?", "Kurapika from Hunter x Hunter with chains", "Hunter x Hunter"],
    ["Could player two steer the ducks in Duck Hunt?", "A cartoon duck flying over a Duck Hunt field", "Duck Hunt"],
  ])("highlights the full title in %s", (question, opportunity, expected) => {
    expect(highlighted(question, opportunity)).toBe(expected);
  });

  it("never absorbs the leading question word", () => {
    expect(highlighted("In Naruto, which lazy genius controls shadows?", "Shikamaru from Naruto")).toBe("Naruto");
  });

  it("keeps lowercase keywords as a single word", () => {
    expect(highlighted("Do classic arcade light guns shoot real laser beams?", "A kid with an arcade light gun")).toBe("arcade");
  });
});
