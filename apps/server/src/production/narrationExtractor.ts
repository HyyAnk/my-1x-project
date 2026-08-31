import { countWords, splitAtNarrativeBoundaries } from "./speechChunker.js";

const AUDIO_CUE_PATTERN = /<!--\s*AUDIO[_ -]?CUE\s*:\s*(chuckle|laugh)\s*-->/gi;
export const HUMOR_POLICY_MARKER = "<!-- HUMOR_POLICY: v1 -->";

export function hasHumorPolicyMarker(markdown: string): boolean {
  return /<!--\s*HUMOR[_ -]?POLICY\s*:\s*v1\s*-->/i.test(markdown);
}

export function extractNarration(markdown: string): string {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/^\s*\[(?:Visual|SFX|Music|On screen|Archive|Reconstruction)[^\]]*\]\s*$/gim, " ")
    .replace(/^#{1,6}\s+.*$/gm, " ")
    .replace(/^\s*\*\*(?:Narrator|Voiceover|VO):\*\*\s*$/gim, " ")
    .replace(/^\s*[-*]\s+/gm, " ")
    .replace(/[*_`>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns narration with supported audio cues restored as Chatterbox tags.
 * The normal narration extractor intentionally removes the HTML comments so
 * scripts, shot plans, and word counts stay clean.
 */
export function extractNarrationForAudio(markdown: string): string {
  return extractNarration(markdown.replace(AUDIO_CUE_PATTERN, (_match, cue: string) => ` [${cue.toLowerCase()}] `));
}

export function extractNarrationSections(markdown: string, includeAudioCues = false): Array<{ title: string; text: string }> {
  const sections = markdown
    .split(/^(?=##\s+)/gm)
    .map((value) => value.trim())
    .filter(Boolean);
  const parsed = sections
    .map((section, index) => {
      const title = section.match(/^##\s+(.+)$/m)?.[1]?.trim() ?? `Section ${index + 1}`;
      return { title, text: includeAudioCues ? extractNarrationForAudio(section) : extractNarration(section) };
    })
    .filter((section) => section.text.length > 0);
  return parsed.length
    ? parsed
    : [{ title: "Narration", text: includeAudioCues ? extractNarrationForAudio(markdown) : extractNarration(markdown) }];
}

export function extractNarrationChunks(markdown: string, maxWords = 70, includeAudioCues = false): Array<{ title: string; text: string }> {
  return extractNarrationSections(markdown, includeAudioCues).flatMap((section) => {
    const chunks = splitAtNarrativeBoundaries(section.text, maxWords);
    if (
      chunks.length > 1 &&
      countWords(chunks[chunks.length - 1]) < 25 &&
      countWords(chunks[chunks.length - 2]) + countWords(chunks[chunks.length - 1]) <= maxWords + 15
    ) {
      chunks.splice(chunks.length - 2, 2, `${chunks[chunks.length - 2]} ${chunks[chunks.length - 1]}`.trim());
    }
    return chunks.map((text, index) => ({
      title: chunks.length === 1 ? section.title : `${section.title} ${index + 1}/${chunks.length}`,
      text,
    }));
  });
}
