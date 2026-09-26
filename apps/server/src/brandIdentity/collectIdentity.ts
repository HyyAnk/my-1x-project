import path from "node:path";
import { synthesizeLegacyCoreStyle } from "@studio/shared";
import type { IdentityCollection, IdentityRepository } from "./identityExport.types.js";
import { readIdentityLogo, readIdentityMascot } from "./identityAssetReader.js";

function safeName(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 70)
      .replace(/^-+|-+$/g, "") || "channel"
  );
}

export async function collectIdentity(repository: IdentityRepository, channelId: string): Promise<IdentityCollection> {
  const channel = await repository.getChannel(channelId);
  const manifest = await repository.getChannelAssetManifest(channel.slug);
  const result: IdentityCollection = { folder: `${safeName(channel.slug)}-identity`, entries: [], warnings: [] };
  const logo = manifest.brand.logo;
  if (logo) {
    try {
      const extension = path.extname(logo.filename).slice(1).toLowerCase();
      if (!/^(png|jpe?g|webp|svg|gif|avif)$/.test(extension)) throw new Error("Unsupported logo format.");
      result.entries.push({
        filename: `logo.${extension}`,
        data: await readIdentityLogo(repository.storageRoot, channel.slug, logo.relative_path),
      });
    } catch {
      result.warnings.push("Channel logo could not be read. Re-upload it and retry.");
    }
  } else result.warnings.push("No channel logo is configured.");
  await collectStyles(repository, channel.mascot_id, result);
  return result;
}

async function collectStyles(repository: IdentityRepository, mascotId: string | null, result: IdentityCollection): Promise<void> {
  if (!mascotId) {
    result.warnings.push("No mascot is assigned to this channel.");
    return;
  }
  const mascot = await repository.getMascot(mascotId);
  if (!mascot) {
    result.warnings.push("The assigned mascot is unavailable.");
    return;
  }
  const styles = mascot.styles?.length ? mascot.styles : [synthesizeLegacyCoreStyle(mascot)];
  for (const [index, style] of styles.entries()) {
    try {
      if (!style.anchor_image_url) throw new Error("Missing style image.");
      const data = await readIdentityMascot(repository, mascotId, style.anchor_image_url);
      result.entries.push({ filename: `mascot-${index + 1}-${safeName(style.name)}.png`, data });
    } catch {
      result.warnings.push(`${style.name}: background-removed image unavailable. Prepare this style and retry.`);
    }
    if (result.entries.reduce((sum, entry) => sum + entry.data.byteLength, 0) > 128 * 1024 * 1024) {
      throw new Error("Identity export exceeds 128 MB. Download the assets individually.");
    }
  }
}
