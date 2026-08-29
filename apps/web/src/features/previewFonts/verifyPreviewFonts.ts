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
  const frameWindow: FontAwareWindow | null = frame.contentWindow;
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
      throw new Error(status.message || "Preview fonts are unavailable");
    }
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
