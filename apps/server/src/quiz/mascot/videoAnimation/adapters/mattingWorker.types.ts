import type { MatteFrameInput, MatteFrameResult, MascotMattingAdapter } from "./mascotMattingAdapter.js";

export interface MattingWorkerRequest {
  id: number;
  input: MatteFrameInput;
}
export type MattingWorkerResponse = { id: number; result: MatteFrameResult } | { id: number; error: { message: string; code: string } };
export interface MattingSession extends MascotMattingAdapter {
  close: () => Promise<void>;
}
