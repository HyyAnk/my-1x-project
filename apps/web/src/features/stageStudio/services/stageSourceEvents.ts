export const STAGE_SOURCE_CHANGED = "studio:stage-source-changed";

export function notifyStageSourceChanged(): void {
  window.dispatchEvent(new Event(STAGE_SOURCE_CHANGED));
}
