export function parseIntroOutroVideoPayload(data: string): Buffer | string {
  if (data.startsWith("data:")) {
    const commaIndex = data.indexOf(",");
    return Buffer.from(data.slice(commaIndex + 1), "base64");
  }
  if (data.length < 500 && (data.includes(":\\") || data.includes(":/") || data.startsWith("/"))) return data;
  return Buffer.from(data, "base64");
}
