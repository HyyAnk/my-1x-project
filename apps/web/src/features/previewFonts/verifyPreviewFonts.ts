export type PreviewFontStatus = {
  state: "loading" | "ready" | "error";
  message?: string;
  families: string[];
};

type FontAwareWindow = Window & {
  __fontReadyPromise?: Promise<PreviewFontStatus>;
  __fontStatus?: PreviewFontStatus;
};

export async function verifyPreviewFonts(frame: HTMLIFrameElement, timeoutMs = 15_000): Promise<void> {
  let frameWindow: FontAwareWindow | null = frame.contentWindow;

  if (!frameWindow?.__fontReadyPromise && frame.contentDocument && frame.contentDocument.readyState !== "complete") {
    const graceLimit = Math.min(timeoutMs, 1500);
    const start = Date.now();
    while (Date.now() - start < graceLimit && !frameWindow?.__fontReadyPromise) {
      await new Promise((resolve) => setTimeout(resolve, 30));
      frameWindow = frame.contentWindow;
    }
  }

  if (!frameWindow?.__fontReadyPromise) throw new Error("Preview font readiness contract is missing");

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const status = await Promise.race([
      frameWindow.__fontReadyPromise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Timed out while verifying preview fonts")), timeoutMs);
      }),
    ]);
    if (status.state !== "ready" || frameWindow.__fontStatus?.state !== "ready") {
      throw new Error(status.message || frameWindow.__fontStatus?.message || "Preview fonts are unavailable");
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err && typeof err.message === "string"
          ? (err as { message: string }).message
          : frameWindow?.__fontStatus?.message || String(err);
    throw new Error(message || "Preview fonts are unavailable", { cause: err });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
