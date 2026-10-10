import path from "node:path";
import { describe, expect, it } from "vitest";
import { episodeProductRef, quizShortProductRef } from "@studio/shared";
import { createRoots } from "../src/repository/pathSafety.js";
import {
  quizProductDirectorySegments,
  quizProductIdOf,
  quizProductRecordFilename,
  quizProductRelativeDirectory,
  resolveQuizProductCollectionDirectory,
  resolveQuizProductDirectory,
  toQuizProductRef,
} from "../src/repository/quizProductPaths.js";

const roots = createRoots(path.resolve("/studio"), path.resolve("/studio/storage"));

describe("quizProductPaths", () => {
  it("passes explicit refs through and resolves string ids by prefix", () => {
    const quizShortRef = quizShortProductRef("ch_1", "qshort_abc");
    expect(toQuizProductRef("ch_1", quizShortRef)).toBe(quizShortRef);
    expect(toQuizProductRef("ch_1", "qshort_abc")).toEqual(quizShortRef);
    expect(toQuizProductRef("ch_1", "ep_abc")).toEqual(episodeProductRef("ch_1", "ep_abc"));
    expect(quizProductIdOf("ep_abc")).toBe("ep_abc");
    expect(quizProductIdOf(quizShortRef)).toBe("qshort_abc");
  });

  it("maps each product kind to its collection directory and record file", () => {
    expect(quizProductDirectorySegments("episode", "fun-facts", "sharks")).toEqual(["fun-facts", "episodes", "sharks"]);
    expect(quizProductDirectorySegments("quiz_short", "fun-facts", "sharks")).toEqual(["fun-facts", "quiz_shorts", "sharks"]);
    expect(quizProductRelativeDirectory("quiz_short", "fun-facts", "sharks")).toBe("channels/fun-facts/quiz_shorts/sharks");
    expect(quizProductRecordFilename("episode")).toBe("episode.json");
    expect(quizProductRecordFilename("quiz_short")).toBe("quiz_short.json");
  });

  it("resolves absolute directories inside the channels root", () => {
    const directory = resolveQuizProductDirectory(roots, "quiz_short", "fun-facts", "sharks", "quiz");
    expect(directory).toBe(path.join(roots.channels, "fun-facts", "quiz_shorts", "sharks", "quiz"));
    expect(resolveQuizProductCollectionDirectory(roots, "episode", "fun-facts")).toBe(path.join(roots.channels, "fun-facts", "episodes"));
  });

  it("rejects unsafe slugs through the shared path safety helper", () => {
    expect(() => resolveQuizProductDirectory(roots, "quiz_short", "fun-facts", "../escape")).toThrow(/Unsafe filesystem path/);
    expect(() => resolveQuizProductDirectory(roots, "episode", "fun-facts", "ok", "nested/../escape")).toThrow(/Unsafe filesystem path/);
  });
});
