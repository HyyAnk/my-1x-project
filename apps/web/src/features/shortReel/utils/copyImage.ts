/**
 * Utility to copy an image to the system clipboard.
 * Modern browsers require an 'image/png' Blob when writing to clipboard.
 * Converts any image format (JPEG, WebP, etc.) to PNG via offscreen canvas
 * before copying.
 */

/**
 * Converts any image Blob into a PNG Blob.
 * If the Blob is already image/png, it returns the Blob directly.
 */
export async function convertBlobToPng(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") {
    return blob;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to create 2D canvas context for PNG conversion"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error("Failed to convert image to PNG blob"));
          }
        }, "image/png");
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for PNG conversion"));
    };

    img.src = objectUrl;
  });
}

/**
 * Copies an image URL directly to the user's system clipboard as image/png.
 */
export async function copyImageToClipboard(imageUrl: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard || typeof navigator.clipboard.write !== "function") {
    throw new Error("Clipboard image write API is not supported in this environment");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image for clipboard: ${response.status} ${response.statusText}`);
  }

  const sourceBlob = await response.blob();
  const pngBlob = await convertBlobToPng(sourceBlob);

  if (typeof ClipboardItem === "undefined") {
    throw new Error("ClipboardItem API is not supported in this environment");
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": pngBlob,
    }),
  ]);

  return true;
}
