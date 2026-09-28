import path from "node:path";
import { parseAnimationArtifactUrl } from "../../../../tasks/video/mascotAnimationResolver.js";
import type { LibraryDocument } from "./libraryReferences.js";

/** Qualified references do not protect unrelated attempts sharing the same frame basename. */
export function mattedReferenceCheck(root: string, documents: LibraryDocument[]): (file: string) => boolean {
  const qualified = new Set<string>();
  const bare = new Set<string>();
  for (const document of documents) {
    // This is the cleanup policy marker, not an application consumer of frame URLs.
    if (path.basename(document.file) === "retained-frames.json") continue;
    let text = (document.value === undefined ? document.text : JSON.stringify(document.value)).replace(/\\\//g, "/");
    text = text.replace(
      /\/(?:api\/mascots\/[\w-]+\/styles\/[\w-]+\/animations\/[\w-]+\/\d+\/artifacts|mascot\/assets\/animations\/[\w-]+\/[\w-]+\/[\w-]+\/\d+)\/frame_\d{3,6}\.png(?:\?[^"\s<>\\]*)?/g,
      (url) => {
        const artifact = parseAnimationArtifactUrl(url);
        if (!artifact) return url;
        qualified.add(
          [artifact.mascotId, artifact.styleId, artifact.state, artifact.slotIndex, artifact.attempt ?? "*", artifact.filename].join("|"),
        );
        return "";
      },
    );
    text = text.replace(/\\+/g, "/");
    text = text.replace(
      /mascots\/([\w-]+)\/animations\/([\w-]+)\/([\w-]+)\/slot_(\d+)\/attempts\/att_(\d+)\/frames\/(?:matted|extracted)\/(frame_\d{3,6}\.png)/g,
      (_match, mascot: string, style: string, state: string, slot: string, attempt: string, frame: string) => {
        qualified.add([mascot, style, state, slot, attempt, frame].join("|"));
        return "";
      },
    );
    for (const match of text.matchAll(/(?<![\w.-])frame_\d{3,6}\.png\b/g)) bare.add(match[0]);
  }
  return (file) => {
    const parts = path.relative(root, file).split(path.sep);
    const name = path.basename(file);
    if (bare.has(name)) return true;
    const prefix = [parts[1], parts[3], parts[4], parts[5].slice(5)];
    return qualified.has([...prefix, parts[7].slice(4), name].join("|")) || qualified.has([...prefix, "*", name].join("|"));
  };
}
