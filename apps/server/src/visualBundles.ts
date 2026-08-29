import { type ContinuityBundle, continuityBundleId, parseContinuityBundles } from "@studio/shared";

export type { ContinuityBundle };
export { continuityBundleId, parseContinuityBundles };

const bundleHeading = /^#{2,3}\s+Continuity bundle\s+(CB[-_ ]?0*(\d+))(?:\s*[:.—-]\s*(.*))?\s*$/gim;

export function replaceBundleAnchorPrompt(markdown: string, bundleNumber: number, newPrompt: string): string {
  const matches = [...markdown.matchAll(bundleHeading)];
  const targetIndex = matches.findIndex((m) => Number(m[2]) === bundleNumber);
  if (targetIndex === -1) return markdown;

  const match = matches[targetIndex];
  const start = match.index ?? 0;
  const end = matches[targetIndex + 1]?.index ?? markdown.length;
  const section = markdown.slice(start, end);

  const variations = ["Anchor-frame prompt", "Anchor frame prompt", "Anchor prompt"];
  const pattern = variations.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const nextFieldPattern =
    "\\n\\s*(?:[-*]\\s*)?(?:\\*\\*)?(?:Reference asset slots|Allowed (?:shot|camera)?\\s*variation|Era|Setting|Location|Subjects|Objects|Wardrobe|Palette|Lighting|Texture|Atmosphere|Continuity bundle)(?:\\*\\*)?\\s*:";

  const regex = new RegExp(
    `((?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?(?:${pattern})(?:\\*\\*)?\\s*:\\s*)([\\s\\S]*?)(?=${nextFieldPattern}|\\n#{2,3}\\s|$)`,
    "i",
  );

  if (!regex.test(section)) return markdown;

  const updatedSection = section.replace(regex, `$1${newPrompt}\n`);
  return markdown.slice(0, start) + updatedSection + markdown.slice(end);
}
