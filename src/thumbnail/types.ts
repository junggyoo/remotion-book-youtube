import { z } from "zod";

export const ThumbnailConfigSchema = z.object({
  hookText: z.string().min(1).max(30),
  expression: z.string().min(1),
  gesture: z.string().min(1),
  mood: z.enum(["dramatic", "mysterious", "confident", "urgent"]).optional(),
  backgroundStyle: z.string().optional(),
});

export type ThumbnailConfig = z.infer<typeof ThumbnailConfigSchema>;
