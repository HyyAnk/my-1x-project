/**
 * Triggers a browser download of an image via Blob and object URL.
 * Guarantees that the downloaded file is saved with the explicit image extension
 * (e.g. portrait-style.png, short-reel-cover.png) rather than being treated as
 * a generic 'All files' type.
 */
export async function downloadImageFile(imageUrl: string, filename: string): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image for download: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  } catch {
    // Direct link fallback if fetch is blocked or fails
    const fallbackAnchor = document.createElement("a");
    fallbackAnchor.href = imageUrl;
    fallbackAnchor.download = filename;
    fallbackAnchor.target = "_blank";
    fallbackAnchor.rel = "noopener noreferrer";
    document.body.appendChild(fallbackAnchor);
    fallbackAnchor.click();
    document.body.removeChild(fallbackAnchor);
  }
}
