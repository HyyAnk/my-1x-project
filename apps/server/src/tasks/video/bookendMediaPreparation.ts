import { copyFile } from "node:fs/promises";
import path from "node:path";
import type { BookendPlacement, PreparedBookendMedia } from "../../quiz/introOutro/bookend.types.js";
import { RepositoryError } from "../../repository/errors.js";

/** Both placements use the same I/O policy but retain independent failure context. */
export async function prepareBookendMedia(
  placement: BookendPlacement,
  sourcePath: string,
  renderRoot: string,
): Promise<PreparedBookendMedia> {
  const filename = `${placement}.mp4`;
  const absolutePath = path.join(renderRoot, filename);
  try {
    await copyFile(sourcePath, absolutePath);
  } catch {
    throw new RepositoryError(
      `Unable to prepare ${placement} media. Check the selected upload and render directory, then retry the same pair.`,
      placement === "intro" ? "INTRO_MEDIA_PREPARATION_FAILED" : "OUTRO_MEDIA_PREPARATION_FAILED",
    );
  }
  return { placement, absolutePath, videoPath: `./${filename}` };
}
