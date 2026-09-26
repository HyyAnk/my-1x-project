import { createMascotMattingAdapter } from "./mascotMattingAdapter.js";
import type { MattingWorkerRequest, MattingWorkerResponse } from "./mattingWorker.types.js";

const adapter = createMascotMattingAdapter();
process.on("disconnect", () => process.exit(0));
process.on("message", async ({ id, input }: MattingWorkerRequest) => {
  let response: MattingWorkerResponse;
  try {
    response = { id, result: await adapter.matteFrame(input) };
  } catch (error) {
    response = {
      id,
      error: {
        message: error instanceof Error ? error.message : "Frame matting failed",
        code: error instanceof Error && "code" in error ? String(error.code) : "FRAME_MATTING_FAILED",
      },
    };
  }
  if (process.connected) process.send?.(response);
});
