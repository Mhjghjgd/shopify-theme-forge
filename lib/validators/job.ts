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
    textMuted: z.string().optional(),
    textLight: z.string().optional(),
  }).passthrough().transform(p => ({
    ...p,
    textMuted: p.textMuted ?? p.textLight ?? '#6b7280',
  })),
  typography: z.object({
    heading: z.string().optional(),
    headingFont: z.string().optional(),
    body: z.string().optional(),
    bodyFont: z.string().optional(),
    headingWeight: z.string().optional(),
    bodyWeight: z.string().optional(),
  }).passthrough().transform(t => ({
    ...t,
    heading: t.heading ?? t.headingFont ?? 'Inter',
    body: t.body ?? t.bodyFont ?? 'Inter',
    headingWeight: t.headingWeight ?? '700',
    bodyWeight: t.bodyWeight ?? '400',
  })),
  style: z.object({
    borderRadius: z.string().optional(),
    cornerRadius: z.string().optional(),
    spacing: z.string().optional(),
    animationStyle: z.string().optional(),
    animationLevel: z.string().optional(),
    layoutType: z.string().optional(),
    aesthetic: z.string().optional(),
    shadowStyle: z.string().optional(),
  }).passthrough().transform(s => ({
    ...s,
    borderRadius: s.borderRadius ?? s.cornerRadius ?? '4px',
    animationStyle: s.animationStyle ?? s.animationLevel ?? 'subtle',
    layoutType: s.layoutType ?? s.aesthetic ?? 'modern',
    spacing: s.spacing ?? 'normal',
  })),
  sections: z.unknown().transform(s => {
    if (Array.isArray(s)) {
      return {
        homepage: ['hero', 'featured-collection', 'promo-banner', 'testimonials', 'newsletter'] as string[],
        hasVideo: false,
        hasParallax: false,
      };
    }
    const obj = (s ?? {}) as { homepage?: string[]; hasVideo?: boolean; hasParallax?: boolean };
    return {
      homepage: obj.homepage ?? ['hero', 'featured-collection', 'promo-banner', 'testimonials', 'newsletter'],
      hasVideo: obj.hasVideo ?? false,
      hasParallax: obj.hasParallax ?? false,
    };
  }),
  imagePromptBase: z.string(),
  brandVoice: z.string(),
  imageSpecs: z.array(z.unknown()).optional(),
}).passthrough();

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
