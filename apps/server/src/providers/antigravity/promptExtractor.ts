export function extractCleanVisualPrompt(rawPrompt: string): string {
  // 1. If prompt has Anchor-frame prompt section (from visual bible or task manifest)
  const anchorMatch = rawPrompt.match(/Anchor[- ]frame prompt\s*:\s*([^\n\r]+)/i);
  if (anchorMatch && anchorMatch[1].trim()) {
    const cleanedAnchor = anchorMatch[1]
      .replace(/\b(?:with\s+a\s+|showing\s+a\s+|displaying\s+a\s+)?(?:question|quiz)\s+card(?:\s+overlay|\s+showing|\s+with)?[^,.]*/gi, "")
      .replace(/\b(?:choice\s+box(?:es)?|answer\s+buttons?|countdown\s+timer|timer\s+bar)\b[^,.]*/gi, "")
      .replace(/[`"]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return (cleanedAnchor || anchorMatch[1].replace(/[`"]/g, "").replace(/\s+/g, " ").trim()).slice(0, 600);
  }

  // 2. If prompt is compiled quiz asset prompt (e.g. Subject: ..., Purpose: ..., Solo hero art contract: ...)
  if (rawPrompt.includes("Subject:") || rawPrompt.includes("Visual Style:") || rawPrompt.includes("Solo hero art contract:")) {
    const subjectMatch = rawPrompt.match(/Subject\s*:\s*([^\n\r]+)/i);
    const subject = subjectMatch ? subjectMatch[1].replace(/\.$/, "").trim() : "";
    const visualStyleMatch = rawPrompt.match(/Visual Style\s*:\s*([^\n\r]+)/i);
    const visualStyle = visualStyleMatch ? visualStyleMatch[1].replace(/\.$/, "").trim() : "";
    const artContractMatch = rawPrompt.match(
      /(?:Solo hero art contract|Every option in this set must share this exact art direction)\s*:\s*([^\n\r]+)/i,
    );
    const artContract = artContractMatch ? artContractMatch[1].replace(/\.$/, "").trim() : "";
    const lightingMatch = rawPrompt.match(/Lighting\s*:\s*([^\n\r]+)/i);
    const lighting = lightingMatch ? lightingMatch[1].replace(/\.$/, "").trim() : "";
    const backgroundMatch = rawPrompt.match(/Background\s*:\s*([^\n\r]+)/i);
    const background = backgroundMatch ? backgroundMatch[1].replace(/\.$/, "").trim() : "";

    const parts = [
      subject ? `Subject: ${subject}.` : "",
      visualStyle ? `Style: ${visualStyle}.` : "",
      artContract ? `Art Direction: ${artContract}.` : "",
      lighting ? `Lighting: ${lighting}.` : "",
      background ? `Background: ${background}.` : "",
      "High quality, vibrant colors, child-friendly, clear focal subject, no text, no letters, no logos, no watermark, no split screen.",
    ].filter(Boolean);

    return parts.join(" ").slice(0, 900);
  }

  // 3. If prompt is structured manifest, extract core visual instructions
  if (rawPrompt.includes("Task type:") || rawPrompt.includes("Channel DNA") || rawPrompt.includes("--- FILE:")) {
    const visualMatch = rawPrompt.match(/Generate exactly one reference image for continuity bundle [^.]*\.\s*([^\n\r]+)/i);
    if (visualMatch && visualMatch[1].trim()) {
      return visualMatch[1].replace(/[`"]/g, "").replace(/\s+/g, " ").trim().slice(0, 600);
    }
  }

  // 4. Fallback: clean raw prompt, remove markdown tags, clamp to max 600 chars
  const cleaned = rawPrompt
    .replace(/--- FILE:[\s\S]*$/i, "")
    .replace(/#+ [^\n\r]+/g, " ")
    .replace(/[`"\\#*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 600);
}
