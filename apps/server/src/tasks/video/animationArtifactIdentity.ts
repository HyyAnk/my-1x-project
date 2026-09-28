/** An absent pin is legacy behavior; an invalid pin must never become unpinned. */
export function parseAttemptPin(url: string): number | undefined | null {
  const query = url.split("#", 1)[0].split("?").slice(1).join("?");
  const values = new URLSearchParams(query).getAll("attempt");
  if (values.length === 0) return undefined;
  if (values.length !== 1 || !/^[1-9]\d*$/.test(values[0])) return null;
  const attempt = Number(values[0]);
  return Number.isSafeInteger(attempt) ? attempt : null;
}

export function isSafeArtifactIdentity(artifact: {
  mascotId: string;
  styleId: string;
  state: string;
  slotIndex: number;
  filename: string;
  attempt?: number;
}): boolean {
  return (
    [artifact.mascotId, artifact.styleId, artifact.state].every((part) => /^[a-zA-Z0-9_-]+$/.test(part)) &&
    Number.isInteger(artifact.slotIndex) &&
    artifact.slotIndex >= 1 &&
    artifact.slotIndex <= 10 &&
    /^[a-zA-Z0-9_.-]+$/.test(artifact.filename) &&
    !artifact.filename.includes("..") &&
    (artifact.attempt === undefined || (Number.isSafeInteger(artifact.attempt) && artifact.attempt > 0))
  );
}
