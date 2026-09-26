import type { PairTexts } from "./pairWorkspace.types";

const key = (channel: string, category: string) => `pair-draft:${channel}:${category}`;
export function readDraftBackup(channel: string, category: string) {
  const raw = localStorage.getItem(key(channel, category));
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !value ||
      typeof value !== "object" ||
      !("projectId" in value) ||
      typeof value.projectId !== "string" ||
      !("version" in value) ||
      typeof value.version !== "number" ||
      !("texts" in value)
    )
      return null;
    const texts = value.texts;
    if (
      !texts ||
      typeof texts !== "object" ||
      !("intro" in texts) ||
      typeof texts.intro !== "string" ||
      !("outro" in texts) ||
      typeof texts.outro !== "string"
    )
      return null;
    return { projectId: value.projectId, version: value.version, texts: { intro: texts.intro, outro: texts.outro } };
  } catch {
    return null;
  }
}
export function writeDraftBackup(channel: string, category: string, projectId: string, version: number, texts: PairTexts) {
  localStorage.setItem(key(channel, category), JSON.stringify({ projectId, version, texts }));
}
export function clearDraftBackup(channel: string, category: string) {
  localStorage.removeItem(key(channel, category));
}
