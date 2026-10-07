/** Normalize current structured quiz choices and legacy string choices at the read boundary. */
export function projectThumbnailChoices(rawChoices: unknown, correctId: unknown): { choices: string[]; answer?: string } {
  if (!Array.isArray(rawChoices)) return { choices: [] };
  const entries = rawChoices.map((choice: unknown, index) => {
    if (typeof choice === "string") return { id: String(index), text: choice };
    if (!choice || typeof choice !== "object" || !("text" in choice) || typeof choice.text !== "string") return null;
    const id = "id" in choice && typeof choice.id === "string" ? choice.id : undefined;
    return { id, text: choice.text };
  });
  return {
    choices: entries.flatMap((entry) => (entry?.text.trim() ? [entry.text] : [])),
    answer: typeof correctId === "string" ? entries.find((entry) => entry?.id === correctId)?.text : undefined,
  };
}
