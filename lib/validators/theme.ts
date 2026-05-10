import { z } from 'zod';

export const GeneratedImageSchema = z.object({
  id: z.string(),
  type: z.string(),
  url: z.string().url(),
  width: z.number(),
  height: z.number(),
  productId: z.string().optional(),
  filename: z.string().optional(),
});

export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;

export const ThemeFilesSchema = z.object({
  settingsData: z.string(),
  settingsSchema: z.string(),
  themeLiquid: z.string(),
  templateIndex: z.string(),
  customCss: z.string(),
  animationsJs: z.string(),
  sections: z.array(
    z.object({
      filename: z.string(),
      content: z.string(),
    })
  ),
});

export type ThemeFiles = z.infer<typeof ThemeFilesSchema>;
