import { z } from "zod";

export const MascotCanvasSizeSchema = z.object({
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
});

export const MascotPointSchema = z.object({
  x: z.number().finite().min(0).max(8192),
  y: z.number().finite().min(0).max(8192),
});

export const MascotBoundsSchema = z.object({
  x: z.number().finite().min(0).max(8192),
  y: z.number().finite().min(0).max(8192),
  width: z.number().finite().positive().max(8192),
  height: z.number().finite().positive().max(8192),
});

export const MascotAssetRegistrationSchema = z
  .object({
    source_width: z.number().int().positive().max(8192),
    source_height: z.number().int().positive().max(8192),
    content_bounds: MascotBoundsSchema,
    pivot: MascotPointSchema,
    offset_x: z.number().finite().min(-8192).max(8192),
    offset_y: z.number().finite().min(-8192).max(8192),
  })
  .superRefine((registration, ctx) => {
    if (registration.content_bounds.x + registration.content_bounds.width > registration.source_width) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content_bounds", "width"],
        message: "Content bounds exceed source width",
      });
    }
    if (registration.content_bounds.y + registration.content_bounds.height > registration.source_height) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content_bounds", "height"],
        message: "Content bounds exceed source height",
      });
    }
    if (registration.pivot.x > registration.source_width) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pivot", "x"],
        message: "Pivot exceeds source width",
      });
    }
    if (registration.pivot.y > registration.source_height) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pivot", "y"],
        message: "Pivot exceeds source height",
      });
    }
  });
