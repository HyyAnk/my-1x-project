import { parseArtifactSectionNumber, type ArtifactSectionKind } from "./artifactSections.js";

export function humorGuidanceForDuration(minutes: number): string {
  if (minutes <= 3) return "weave 1–2 dry, evidence-grounded humor beats across the story";
  if (minutes <= 5) return "weave 2–3 dry, evidence-grounded humor beats across the story";
  return "weave 2–4 dry, evidence-grounded humor beats across the story";
}

export function sequenceGuidanceForDuration(minutes: number): string {
  if (minutes <= 3) return "5–6";
  if (minutes <= 5) return "6–8";
  return "7–10";
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function selectSections(markdown: string, headings: string[]): string {
  return headings
    .map((heading) => {
      const match = markdown.match(new RegExp(`## ${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i"));
      return match ? `## ${heading}\n${match[1].trim()}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export function excerptForScene(script: string, sceneNumber: number): string {
  const lines = script.split(/\r?\n/);
  const center = Math.min(lines.length, Math.max(0, Math.floor((lines.length * sceneNumber) / Math.max(1, sceneNumber + 1))));
  return lines.slice(Math.max(0, center - 18), center + 18).join("\n");
}

export function selectMarkdownSection(
  markdown: string,
  sectionNumber: number,
  headingPattern: RegExp = /^##\s+/i,
  kind?: ArtifactSectionKind,
): string {
  const lines = markdown.split(/\r?\n/);
  const starts = lines.map((line, index) => (headingPattern.test(line) ? index : -1)).filter((index) => index >= 0);
  const numberedStarts = kind
    ? starts.filter((index) => parseArtifactSectionNumber(lines[index].replace(/^##\s+/, ""), kind) !== null)
    : [];
  const explicitStart = kind
    ? numberedStarts.find((index) => parseArtifactSectionNumber(lines[index].replace(/^##\s+/, ""), kind) === sectionNumber)
    : undefined;
  const start = explicitStart ?? (kind && numberedStarts.length > 0 ? undefined : starts[sectionNumber - 1]);
  if (start === undefined) throw new Error(`Sequence ${sectionNumber} was not found in an upstream artifact`);
  const next = starts.find((candidate) => candidate > start) ?? lines.length;
  return lines.slice(start, next).join("\n").trim();
}

export function selectMarkdownSectionOrFallback(
  markdown: string,
  sectionNumber: number,
  headingPattern: RegExp,
  kind: ArtifactSectionKind,
  artifactName: string,
): string {
  try {
    return selectMarkdownSection(markdown, sectionNumber, headingPattern, kind);
  } catch {
    const content = markdown.trim();
    if (!content) throw new Error(`Sequence ${sectionNumber} was not found in an upstream artifact`);
    return [
      `## ${artifactName} fallback for requested section ${sectionNumber}`,
      "The upstream artifact has no dedicated numbered section for this request. Preserve the requested sequence/question number and infer only stable identity rules from the complete artifact below.",
      content,
    ].join("\n\n");
  }
}

export function selectResearchForSequence(researchMarkdown: string, sequenceNumber: number, isQuiz: boolean): string {
  const claimId = `C${String(sequenceNumber).padStart(2, "0")}`;
  const shortClaimId = `C${sequenceNumber}`;
  const lines = researchMarkdown.split(/\r?\n/);

  const claimHeaderIndex = lines.findIndex((line) =>
    new RegExp(`^###?\\s+(?:${claimId}|${shortClaimId}|Question\\s+${sequenceNumber}\\b)`, "i").test(line),
  );

  if (claimHeaderIndex !== -1) {
    const nextHeaderIndex = lines.findIndex((line, idx) => idx > claimHeaderIndex && /^###?\s+/i.test(line));
    const claimSection = lines
      .slice(claimHeaderIndex, nextHeaderIndex === -1 ? lines.length : nextHeaderIndex)
      .join("\n")
      .trim();

    const tableStartIndex = lines.findIndex((line) => line.includes("| Question |") || line.includes("| Claim ID |"));
    let ledgerRow = "";
    if (tableStartIndex !== -1) {
      const headerLine = lines[tableStartIndex] || "";
      const separatorLine = lines[tableStartIndex + 1] || "";
      const rowLine =
        lines
          .slice(tableStartIndex + 2)
          .find(
            (line) =>
              line.includes(`Q${sequenceNumber}`) ||
              line.includes(`Q0${sequenceNumber}`) ||
              line.includes(`| ${claimId}`) ||
              line.includes(`| ${shortClaimId}`),
          ) || "";
      if (rowLine) {
        ledgerRow = `### Answer Ledger Summary\n${headerLine}\n${separatorLine}\n${rowLine}\n\n`;
      }
    }

    return `${ledgerRow}### Scoped Research Evidence for Sequence ${sequenceNumber} (${claimId})\n\n${claimSection}`;
  }

  return researchMarkdown;
}

export { buildOutputContract, type OutputContractInput } from "./context/taskInstructions.js";
