import { z } from 'zod';

export const CreateJobSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(2000),
  storeName: z.string().min(1, 'Store name is required').max(100),
  niche: z.enum([
    'Fashion',
    'Streetwear',
    'Luxury',
    'Beauty',
    'Sports',
    'Electronics',
    'Home',
    'Food',
    'Other',
  ]),
  colorMood: z.enum(['Warm', 'Cool', 'Neutral', 'Dark', 'Bright']).optional(),
  layoutStyle: z.enum(['Minimal', 'Bold', 'Editorial', 'Luxury', 'Playful']).optional(),
  animationLevel: z.enum(['Subtle', 'Dynamic', 'Intense']).optional(),
  referenceImages: z.array(z.string().url()).max(5).default([]),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

export const DesignBriefSchema = z.object({
  palette: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    surface: z.string(),
    text: z.string(),
    textMuted: z.string(),
  }),
  typography: z.object({
    heading: z.string(),
    body: z.string(),
    headingWeight: z.string(),
    bodyWeight: z.string(),
  }),
  style: z.object({
    borderRadius: z.string(),
    spacing: z.enum(['compact', 'normal', 'spacious']),
    animationStyle: z.enum(['subtle', 'dynamic', 'intense']),
    layoutType: z.enum(['minimal', 'bold', 'editorial', 'luxury', 'playful']),
  }),
  sections: z.object({
    homepage: z.array(z.string()),
    hasVideo: z.boolean(),
    hasParallax: z.boolean(),
  }),
  imagePromptBase: z.string(),
  brandVoice: z.string(),
});

export type DesignBrief = z.infer<typeof DesignBriefSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortDescription: z.string(),
  longDescription: z.string(),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  variants: z.array(
    z.object({
      option: z.string(),
      values: z.array(z.string()),
    })
  ),
  tags: z.array(z.string()),
  imagePrompt: z.string(),
});

export const ProductsResponseSchema = z.object({
  products: z.array(ProductSchema),
});

export type Product = z.infer<typeof ProductSchema>;
