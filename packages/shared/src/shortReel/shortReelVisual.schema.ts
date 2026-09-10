import { z } from "zod";

export const ReelVisualContextSchema = z
  .object({
    mascot_id: z.string().min(1),
    mascot_name: z.string().min(1),
    mascot_asset_path: z.string().min(1),
    mascot_checksum: z.string().min(1),
    art_direction: z.string().min(1),
    style_preset_id: z.string().nullable(),
    fingerprint: z.string().min(1),
  })
  .strict();

export type ReelVisualContext = z.infer<typeof ReelVisualContextSchema>;
