import { z } from "zod";

export const ReelPublishingPayloadSchema = z.preprocess(
  (val) => {
    if (val && typeof val === "object") {
      const obj = val as Record<string, unknown>;
      if ("hook" in obj && !("title" in obj)) {
        const hook = typeof obj.hook === "string" ? obj.hook.trim() : typeof obj.hook === "number" ? String(obj.hook) : "";
        let desc =
          typeof obj.description === "string" ? obj.description.trim() : typeof obj.description === "number" ? String(obj.description) : "";
        if (obj.cta && typeof obj.cta === "string") {
          const cta = obj.cta.trim();
          if (cta && !desc.includes(cta)) {
            desc = desc ? `${desc}\n\n${cta}` : cta;
          }
        }
        if (Array.isArray(obj.hashtags) && obj.hashtags.length > 0) {
          const tags = obj.hashtags.map((t: unknown) => String(t).trim()).filter(Boolean);
          if (tags.length > 0) {
            const tagsJoined = tags.join(" ");
            desc = desc ? `${desc}\n\n${tagsJoined}` : tagsJoined;
          }
        }
        return { title: hook, description: desc };
      }
    }
    return val;
  },
  z
    .object({
      title: z.string().trim().min(1).max(500),
      description: z.string().trim().min(1).max(8000),
    })
    .strict(),
);

export const GeneratedReelPublishingSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(600),
  })
  .strict();

export type ReelPublishingPayload = z.infer<typeof ReelPublishingPayloadSchema>;
export type GeneratedReelPublishing = z.infer<typeof GeneratedReelPublishingSchema>;
