import { z } from "zod";

export const BrandIdentityExportSchema = z.object({
  folder: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  files: z
    .array(
      z.object({
        filename: z.string().regex(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/),
        base64: z.string().min(1),
      }),
    )
    .min(1),
  warnings: z.array(z.string()),
});

export type BrandIdentityExport = z.infer<typeof BrandIdentityExportSchema>;
