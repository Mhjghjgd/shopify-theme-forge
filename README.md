# ShopifyThemeForge

AI-powered Shopify theme generator. Upload reference images + describe your brand → get a complete, importable `.zip` Shopify theme in ~8 minutes.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Prisma · Upstash Redis/QStash · Vercel Blob · OpenAI GPT-Image-2 · Anthropic Claude Sonnet

---

## Setup Guide

### 1. Clone & Install

```bash
git clone <your-repo>
cd shopify-theme-forge
npm install
```

### 2. Download Shopify Dawn Base Theme

```bash
npm run setup:dawn
```

This clones Shopify's official Dawn theme into `templates/dawn-base/` (excluded from git).

### 3. Create Your Project on Vercel

```bash
npx vercel link
```

### 4. Enable Vercel Postgres

1. Go to your Vercel dashboard → **Storage** → **Create Database** → **Postgres**
2. Copy the connection strings to `.env.local`:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

### 5. Enable Vercel Blob Storage

1. Vercel dashboard → **Storage** → **Create Database** → **Blob**
2. Copy the token to `.env.local`:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

### 6. Create Upstash Redis

1. Go to [console.upstash.com](https://console.upstash.com) → Create a new Redis database
2. Copy REST URL and token to `.env.local`:

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### 7. Create Upstash QStash

1. Upstash console → **QStash**
2. Copy the 3 keys to `.env.local`:

```env
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
```

### 8. Get Anthropic API Key

1. Go to console.anthropic.com/settings/keys
2. Create a new key:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### 9. Get OpenAI API Key

1. Go to platform.openai.com/api-keys
2. Create a new key:

```env
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-2
```

### 10. Run Database Migration

```bash
npm run db:generate
npm run db:migrate
```

### 11. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## Deploy to Production

```bash
npx vercel --prod
```

Set all `.env.local` variables in Vercel project → Environment Variables.

---

## Pipeline Architecture

| Step | Route | Progress |
|------|-------|----------|
| Analyze references | `/api/pipeline/analyze` | 5% → 20% |
| Generate products | `/api/pipeline/products` | 20% → 35% |
| Generate 15 images | `/api/pipeline/images` | 35% → 75% |
| Build theme files | `/api/pipeline/customize` | 75% → 92% |
| Package .zip | `/api/pipeline/zip` | 92% → 100% |

## Generated .zip Contents

```
theme/
├── assets/
│   ├── theme-custom.css       # AI-generated styles & colors
│   ├── theme-animations.js    # Scroll & parallax animations
│   ├── hero.jpg               # GPT-Image-2 hero image
│   ├── hero-banner.jpg        # Promotional banner image
│   ├── about.jpg              # Brand story image
│   ├── product-{1-4}-main.jpg
│   ├── product-{1-4}-lifestyle.jpg
│   └── product-{1-4}-detail.jpg
├── config/
│   ├── settings_data.json     # Colors, fonts, layout config
│   └── settings_schema.json   # Shopify Customizer color pickers
├── layout/theme.liquid        # Google Fonts + assets injected
├── sections/
│   ├── custom-testimonials.liquid
│   ├── custom-features.liquid
│   └── custom-promo-banner.liquid
├── templates/index.json       # Homepage sections & order
├── products.csv               # 4 products ready to import
└── IMPORT_GUIDE.md
```

## Environment Variables

| Variable | Source |
|----------|--------|
| `OPENAI_API_KEY` | platform.openai.com/api-keys |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2` |
| `ANTHROPIC_API_KEY` | console.anthropic.com/settings/keys |
| `UPSTASH_REDIS_REST_URL` | console.upstash.com → Redis |
| `UPSTASH_REDIS_REST_TOKEN` | console.upstash.com → Redis |
| `QSTASH_TOKEN` | console.upstash.com/qstash |
| `QSTASH_CURRENT_SIGNING_KEY` | console.upstash.com/qstash |
| `QSTASH_NEXT_SIGNING_KEY` | console.upstash.com/qstash |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob |
| `DATABASE_URL` | Vercel → Storage → Postgres |
| `DIRECT_URL` | Vercel → Storage → Postgres |
| `NEXT_PUBLIC_APP_URL` | Your deployment URL (e.g. https://yourapp.vercel.app) |
