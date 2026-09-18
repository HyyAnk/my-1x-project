/**
 * Triggers a file download in the browser by creating and clicking a temporary anchor element.
 *
 * @param url - The URL of the file to download
 * @param defaultFilename - Suggested filename for the downloaded asset
 */
export function triggerBrowserDownload(url: string, defaultFilename: string): void {
  if (typeof window === "undefined" || !url) {
    return;
  }

  const separator = url.includes("?") ? "&" : "?";
  const downloadUrl = `${url}${separator}download=true`;
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = defaultFilename;
  link.rel = "noopener noreferrer";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
