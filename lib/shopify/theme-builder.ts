import path from 'path';
import fs from 'fs-extra';
import type { DesignBrief } from '../validators/job';
import type { Product } from '../validators/job';
import type { GeneratedImage } from '../validators/theme';
import { sanitizeLiquidJson } from './liquid-validator';
import { generateWithClaude } from '../anthropic';

export interface ThemeBuildInput {
  jobId: string;
  designBrief: DesignBrief;
  products: Product[];
  generatedImages: GeneratedImage[];
  storeName: string;
  niche: string;
}

function getDawnBase() {
  return path.join(process.env.__NEXT_PRIVATE_ORIGIN ?? process.cwd(), 'templates', 'dawn-base');
}
function getTmpBase() {
  return path.join(process.env.__NEXT_PRIVATE_ORIGIN ?? process.cwd(), 'tmp', 'jobs');
}

export async function buildTheme(input: ThemeBuildInput): Promise<string> {
  const { jobId, designBrief, products, generatedImages, storeName } = input;

  const dawnBase = getDawnBase();
  const themePath = path.join(getTmpBase(), jobId, 'theme');

  // Copy Dawn base
  await fs.ensureDir(themePath);
  if (await fs.pathExists(dawnBase)) {
    await fs.copy(dawnBase, themePath, { overwrite: true });
  } else {
    // Create minimal structure if Dawn not cloned
    await createMinimalDawnStructure(themePath);
  }

  // Step 4.1 — settings_data.json
  await buildSettingsData(themePath, designBrief, generatedImages);

  // Step 4.2 — theme-custom.css
  await buildCustomCss(themePath, designBrief);

  // Step 4.3 — theme-animations.js
  await buildAnimationsJs(themePath, designBrief);

  // Step 4.4 — layout/theme.liquid
  await patchThemeLiquid(themePath, designBrief);

  // Step 4.5 — templates/index.json
  await buildIndexTemplate(themePath, designBrief, generatedImages);

  // Step 4.6 — Custom sections
  await buildCustomSections(themePath, designBrief, storeName);

  // Step 4.7 — settings_schema.json (add color pickers)
  await patchSettingsSchema(themePath, designBrief);

  // Copy generated images into assets
  await copyImagesToAssets(themePath, generatedImages);

  // Add products.csv
  await buildProductsCsv(themePath, products, generatedImages, storeName);

  // Add IMPORT_GUIDE.md
  await buildImportGuide(themePath, storeName);

  return themePath;
}

async function buildSettingsData(themePath: string, brief: DesignBrief, images: GeneratedImage[]) {
  const heroImage = images.find((i) => i.type === 'hero');
  const { palette, typography } = brief;

  const settingsData = {
    current: 'Default',
    sections: {},
    settings: {
      color_background_1: palette.background,
      color_background_2: palette.surface,
      color_foreground: palette.text,
      color_button: palette.primary,
      color_button_label: '#ffffff',
      color_secondary_button_label: palette.primary,
      color_border: palette.secondary,
      color_shadow: palette.primary,
      font_heading: `${typography.heading.replace(/ /g, '_')}_n${typography.headingWeight}.typekit.json`,
      font_body: `${typography.body.replace(/ /g, '_')}_n${typography.bodyWeight}.typekit.json`,
      font_heading_scale: 1.2,
      font_body_scale: 1.0,
      page_width: 1400,
      spacing_sections: 0,
      buttons_border_thickness: 1,
      buttons_border_opacity: 100,
      buttons_radius: parseInt(brief.style.borderRadius) || 4,
      inputs_border_thickness: 1,
      inputs_border_opacity: 55,
      inputs_radius: 4,
      ...(heroImage ? { hero_image: heroImage.url } : {}),
    },
  };

  const configDir = path.join(themePath, 'config');
  await fs.ensureDir(configDir);
  await fs.writeJson(path.join(configDir, 'settings_data.json'), settingsData, { spaces: 2 });
}

async function buildCustomCss(themePath: string, brief: DesignBrief) {
  const { palette, typography, style } = brief;

  const animDuration = style.animationStyle === 'subtle' ? '0.3s' : style.animationStyle === 'intense' ? '0.8s' : '0.5s';

  const css = `/* ShopifyThemeForge — Custom CSS Override */
:root {
  --color-base-background-1: ${palette.background};
  --color-base-background-2: ${palette.surface};
  --color-base-text: ${palette.text};
  --color-base-text-muted: ${palette.textMuted};
  --color-base-accent-1: ${palette.primary};
  --color-base-accent-2: ${palette.secondary};
  --color-base-accent-3: ${palette.accent};
  --transition-base: all ${animDuration} cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: all ${parseFloat(animDuration) * 2}s cubic-bezier(0.4, 0, 0.2, 1);
  --border-radius: ${style.borderRadius};
  --font-heading: '${typography.heading}', serif;
  --font-body: '${typography.body}', sans-serif;
}

/* Scroll animations */
.shopify-section {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.shopify-section.visible {
  opacity: 1;
  transform: translateY(0);
}
.shopify-section:first-of-type {
  opacity: 1;
  transform: none;
}

/* Product card hover */
.card__media img {
  transition: transform ${animDuration} cubic-bezier(0.4, 0, 0.2, 1);
}
.card-wrapper:hover .card__media img {
  transform: scale(1.05);
}
.card-wrapper {
  transition: box-shadow ${animDuration} ease;
  border-radius: ${style.borderRadius};
  overflow: hidden;
}
.card-wrapper:hover {
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}

/* Hero parallax */
.banner__media {
  will-change: transform;
  overflow: hidden;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  letter-spacing: -0.02em;
}
body {
  font-family: var(--font-body);
}

/* Primary buttons */
.button, .button--primary {
  background-color: ${palette.primary};
  border-color: ${palette.primary};
  color: #ffffff;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.85rem;
  border-radius: ${style.borderRadius};
  transition: var(--transition-base);
}
.button:hover, .button--primary:hover {
  background-color: ${palette.accent};
  border-color: ${palette.accent};
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

/* Secondary buttons */
.button--secondary {
  background-color: transparent;
  border-color: ${palette.primary};
  color: ${palette.primary};
  border-radius: ${style.borderRadius};
  transition: var(--transition-base);
}
.button--secondary:hover {
  background-color: ${palette.primary};
  color: #ffffff;
}

/* Navigation */
.header__heading-link {
  font-family: var(--font-heading);
  font-size: 1.5rem;
}
.header {
  background-color: ${palette.background};
  border-bottom: 1px solid ${palette.secondary}22;
}
.header__menu-item {
  color: ${palette.text};
  transition: color 0.2s ease;
}
.header__menu-item:hover {
  color: ${palette.primary};
}

/* Footer */
.footer {
  background-color: ${palette.surface};
  color: ${palette.textMuted};
}
.footer__heading {
  color: ${palette.text};
  font-family: var(--font-heading);
}

/* Promo banner */
.announcement-bar {
  background-color: ${palette.primary};
  color: #ffffff;
}

/* Collection page */
.collection-hero__image img {
  transition: transform 0.8s ease;
}
.collection-hero:hover .collection-hero__image img {
  transform: scale(1.03);
}

/* Price */
.price--large {
  color: ${palette.primary};
  font-weight: ${typography.headingWeight};
}

/* Input fields */
.field__input {
  border-color: ${palette.secondary};
  border-radius: ${style.borderRadius};
  color: ${palette.text};
  background: ${palette.background};
}
.field__input:focus {
  border-color: ${palette.primary};
  box-shadow: 0 0 0 1px ${palette.primary};
}

/* Spacing based on brief */
${
  style.spacing === 'compact'
    ? '.shopify-section { padding-top: 2rem; padding-bottom: 2rem; }'
    : style.spacing === 'spacious'
    ? '.shopify-section { padding-top: 6rem; padding-bottom: 6rem; }'
    : '.shopify-section { padding-top: 4rem; padding-bottom: 4rem; }'
}
`;

  const assetsDir = path.join(themePath, 'assets');
  await fs.ensureDir(assetsDir);
  await fs.writeFile(path.join(assetsDir, 'theme-custom.css'), css);
}

async function buildAnimationsJs(themePath: string, brief: DesignBrief) {
  const parallax = brief.sections.hasParallax;
  const intensity = brief.style.animationStyle;

  const js = `// ShopifyThemeForge — Scroll & Parallax Animations
(function() {
  'use strict';

  function initScrollAnimations() {
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: ${intensity === 'subtle' ? '0.15' : '0.1'},
      rootMargin: '0px 0px -${intensity === 'intense' ? '80' : '50'}px 0px'
    });

    document.querySelectorAll('.shopify-section:not(:first-of-type)').forEach(function(section) {
      observer.observe(section);
    });
  }

${
  parallax
    ? `  function initParallax() {
    var hero = document.querySelector('.banner__media');
    if (!hero) return;

    var ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          var scrolled = window.pageYOffset;
          var rate = ${intensity === 'subtle' ? '0.2' : intensity === 'intense' ? '0.4' : '0.3'};
          if (scrolled < window.innerHeight) {
            hero.style.transform = 'translateY(' + (scrolled * rate) + 'px)';
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }`
    : '  function initParallax() { /* parallax disabled */ }'
}

  function initProductHover() {
    document.querySelectorAll('.card-wrapper').forEach(function(card) {
      card.addEventListener('mouseenter', function() {
        var img = this.querySelector('.card__media img');
        if (img) img.style.transform = 'scale(1.05)';
      });
      card.addEventListener('mouseleave', function() {
        var img = this.querySelector('.card__media img');
        if (img) img.style.transform = 'scale(1)';
      });
    });
  }

  function init() {
    initScrollAnimations();
    initParallax();
    initProductHover();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;

  const assetsDir = path.join(themePath, 'assets');
  await fs.ensureDir(assetsDir);
  await fs.writeFile(path.join(assetsDir, 'theme-animations.js'), js);
}

async function patchThemeLiquid(themePath: string, brief: DesignBrief) {
  const liquidPath = path.join(themePath, 'layout', 'theme.liquid');
  await fs.ensureDir(path.join(themePath, 'layout'));

  let content = '';
  if (await fs.pathExists(liquidPath)) {
    content = await fs.readFile(liquidPath, 'utf-8');
  } else {
    content = getMinimalThemeLiquid();
  }

  const { heading, body } = brief.typography;
  const headingEncoded = encodeURIComponent(heading).replace(/%20/g, '+');
  const bodyEncoded = encodeURIComponent(body).replace(/%20/g, '+');

  const headInject = `
  {{ 'theme-custom.css' | asset_url | stylesheet_tag }}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${headingEncoded}:wght@400;600;700&family=${bodyEncoded}:wght@400;500&display=swap" rel="stylesheet">`;

  const bodyInject = `  {{ 'theme-animations.js' | asset_url | script_tag }}`;

  if (content.includes('</head>')) {
    content = content.replace('</head>', `${headInject}\n</head>`);
  } else {
    content = headInject + '\n' + content;
  }

  if (content.includes('</body>')) {
    content = content.replace('</body>', `${bodyInject}\n</body>`);
  } else {
    content = content + '\n' + bodyInject;
  }

  await fs.writeFile(liquidPath, content);
}

async function buildIndexTemplate(
  themePath: string,
  brief: DesignBrief,
  images: GeneratedImage[]
) {
  const heroImage = images.find((i) => i.type === 'hero');
  const bannerImage = images.find((i) => i.type === 'banner');

  const sections: Record<string, unknown> = {};
  const order: string[] = [];

  // Build sections based on brief.sections.homepage
  for (const sectionKey of brief.sections.homepage) {
    switch (sectionKey) {
      case 'hero':
        sections['main-hero'] = {
          type: 'image-banner',
          settings: {
            image: heroImage?.url || '',
            image_overlay_opacity: 20,
            image_height: 'large',
            desktop_content_position: 'middle-left',
            show_text_box: true,
            desktop_content_alignment: 'left',
            color_scheme: 'background-1',
            first_button_label: 'Shop Now',
            first_button_link: '/collections/all',
          },
          blocks: {},
          block_order: [],
        };
        order.push('main-hero');
        break;

      case 'featured-collection':
        sections['featured-collection'] = {
          type: 'featured-collection',
          settings: {
            title: 'New Arrivals',
            description: '',
            show_description: false,
            description_style: 'body',
            columns_desktop: 4,
            color_scheme: 'background-1',
            show_view_all: true,
            view_all_style: 'solid',
            enable_desktop_slider: false,
            full_width: false,
            products_to_show: 4,
            columns_mobile: 2,
          },
          blocks: {},
          block_order: [],
        };
        order.push('featured-collection');
        break;

      case 'promo-banner':
        sections['custom-promo-banner'] = {
          type: 'custom-promo-banner',
          settings: {
            background_color: brief.palette.primary,
            text_color: '#ffffff',
            heading: 'Limited Time Offer',
            subheading: 'Use code WELCOME20 for 20% off your first order',
            button_label: 'Shop Now',
            button_link: '/collections/all',
            show_countdown: false,
          },
          blocks: {},
          block_order: [],
        };
        order.push('custom-promo-banner');
        break;

      case 'product-grid':
        sections['main-collection-product-grid'] = {
          type: 'main-collection-product-grid',
          settings: {
            columns_desktop: 4,
            color_scheme: 'background-2',
            image_ratio: 'adapt',
            show_secondary_image: true,
            show_vendor: false,
            show_rating: false,
            enable_quick_add: true,
            columns_mobile: 2,
          },
          blocks: {},
          block_order: [],
        };
        order.push('main-collection-product-grid');
        break;

      case 'testimonials':
        sections['custom-testimonials'] = {
          type: 'custom-testimonials',
          settings: {
            background_color: brief.palette.surface,
            columns: 3,
            padding_top: 60,
            padding_bottom: 60,
          },
          blocks: {
            'block-1': { type: 'testimonial', settings: { text: 'Absolutely love the quality! This brand exceeded all my expectations.', author: 'Sarah M.' } },
            'block-2': { type: 'testimonial', settings: { text: 'Fast shipping, beautiful packaging, and the product is even better in person!', author: 'James K.' } },
            'block-3': { type: 'testimonial', settings: { text: 'Finally found a brand that truly delivers on its promises. 10/10 recommend.', author: 'Priya L.' } },
          },
          block_order: ['block-1', 'block-2', 'block-3'],
        };
        order.push('custom-testimonials');
        break;

      case 'newsletter':
        sections['email-signup'] = {
          type: 'email-signup',
          settings: {
            color_scheme: 'accent-1',
            full_width: true,
            heading: 'Subscribe to our newsletter',
            description: 'Be the first to know about new arrivals and exclusive offers.',
            placeholder: 'Your email address',
            button_label: 'Subscribe',
          },
          blocks: {},
          block_order: [],
        };
        order.push('email-signup');
        break;
    }
  }

  // Add custom features section
  sections['custom-features'] = {
    type: 'custom-features',
    settings: {
      background_color: brief.palette.background,
      columns: 3,
      padding_top: 60,
      padding_bottom: 60,
    },
    blocks: {
      'feat-1': { type: 'feature', settings: { icon: '🚚', title: 'Free Shipping', description: 'On orders over $75' } },
      'feat-2': { type: 'feature', settings: { icon: '✓', title: 'Quality Guarantee', description: '30-day easy returns' } },
      'feat-3': { type: 'feature', settings: { icon: '★', title: 'Premium Quality', description: 'Carefully crafted products' } },
    },
    block_order: ['feat-1', 'feat-2', 'feat-3'],
  };

  if (!order.includes('custom-features')) {
    order.splice(2, 0, 'custom-features');
  }

  const indexJson = { sections, order };
  const templatesDir = path.join(themePath, 'templates');
  await fs.ensureDir(templatesDir);
  await fs.writeJson(path.join(templatesDir, 'index.json'), indexJson, { spaces: 2 });
}

async function buildCustomSections(
  themePath: string,
  brief: DesignBrief,
  storeName: string
) {
  const sectionsDir = path.join(themePath, 'sections');
  await fs.ensureDir(sectionsDir);

  const { palette } = brief;

  // Testimonials section
  const testimonials = `{%- style -%}
  .testimonials-section {
    background-color: {{ section.settings.background_color }};
    padding: {{ section.settings.padding_top }}px 0 {{ section.settings.padding_bottom }}px;
  }
  .testimonials-header {
    text-align: center;
    margin-bottom: 3rem;
  }
  .testimonials-header h2 {
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    color: ${palette.text};
    margin-bottom: 0.5rem;
  }
  .testimonials-grid {
    display: grid;
    grid-template-columns: repeat({{ section.settings.columns }}, 1fr);
    gap: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
  }
  .testimonial-card {
    background: ${palette.background};
    border-radius: ${brief.style.borderRadius};
    padding: 2rem;
    box-shadow: 0 2px 20px rgba(0,0,0,0.06);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    border: 1px solid ${palette.secondary}22;
  }
  .testimonial-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
  }
  .testimonial-stars { color: #f59e0b; font-size: 1.1rem; margin-bottom: 1rem; }
  .testimonial-text { color: ${palette.textMuted}; line-height: 1.7; font-style: italic; margin-bottom: 1rem; }
  .testimonial-author { font-weight: 600; color: ${palette.text}; }
  @media (max-width: 768px) {
    .testimonials-grid { grid-template-columns: 1fr; }
  }
{%- endstyle -%}

<div class="testimonials-section">
  <div class="testimonials-header">
    <h2>{{ section.settings.heading }}</h2>
    <p style="color: ${palette.textMuted};">{{ section.settings.subheading }}</p>
  </div>
  <div class="testimonials-grid">
    {%- for block in section.blocks -%}
      {%- case block.type -%}
        {%- when 'testimonial' -%}
          <div class="testimonial-card" {{ block.shopify_attributes }}>
            <div class="testimonial-stars">★★★★★</div>
            <p class="testimonial-text">{{ block.settings.text }}</p>
            <span class="testimonial-author">— {{ block.settings.author }}</span>
          </div>
      {%- endcase -%}
    {%- endfor -%}
  </div>
</div>

{% schema %}
{
  "name": "Testimonials",
  "tag": "section",
  "class": "section",
  "settings": [
    {"type": "text", "id": "heading", "label": "Heading", "default": "What Our Customers Say"},
    {"type": "text", "id": "subheading", "label": "Subheading", "default": "Thousands of happy customers worldwide"},
    {"type": "color", "id": "background_color", "label": "Background color", "default": "#f9fafb"},
    {"type": "range", "id": "columns", "min": 1, "max": 4, "step": 1, "label": "Columns (desktop)", "default": 3},
    {"type": "range", "id": "padding_top", "min": 0, "max": 100, "step": 4, "unit": "px", "label": "Padding top", "default": 60},
    {"type": "range", "id": "padding_bottom", "min": 0, "max": 100, "step": 4, "unit": "px", "label": "Padding bottom", "default": 60}
  ],
  "blocks": [
    {
      "type": "testimonial",
      "name": "Testimonial",
      "settings": [
        {"type": "textarea", "id": "text", "label": "Review text", "default": "Amazing product quality, exceeded my expectations!"},
        {"type": "text", "id": "author", "label": "Customer name", "default": "Sarah M."}
      ]
    }
  ],
  "presets": [
    {
      "name": "Testimonials",
      "blocks": [
        {"type": "testimonial"},
        {"type": "testimonial"},
        {"type": "testimonial"}
      ]
    }
  ]
}
{% endschema %}`;

  // Features / Brand advantages section
  const features = `{%- style -%}
  .features-section {
    background-color: {{ section.settings.background_color }};
    padding: {{ section.settings.padding_top }}px 0 {{ section.settings.padding_bottom }}px;
  }
  .features-header {
    text-align: center;
    margin-bottom: 3rem;
  }
  .features-header h2 {
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    color: ${palette.text};
    margin-bottom: 0.5rem;
  }
  .features-grid {
    display: grid;
    grid-template-columns: repeat({{ section.settings.columns }}, 1fr);
    gap: 2.5rem;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
  }
  .feature-item {
    text-align: center;
    padding: 2rem 1.5rem;
    border-radius: ${brief.style.borderRadius};
    transition: transform 0.3s ease;
  }
  .feature-item:hover { transform: translateY(-4px); }
  .feature-icon {
    font-size: 2.5rem;
    display: block;
    margin-bottom: 1rem;
  }
  .feature-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: ${palette.text};
    margin-bottom: 0.5rem;
  }
  .feature-description {
    color: ${palette.textMuted};
    font-size: 0.95rem;
    line-height: 1.6;
  }
  @media (max-width: 768px) {
    .features-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 480px) {
    .features-grid { grid-template-columns: 1fr; }
  }
{%- endstyle -%}

<div class="features-section">
  <div class="features-header">
    <h2>{{ section.settings.heading }}</h2>
    <p style="color: ${palette.textMuted};">{{ section.settings.subheading }}</p>
  </div>
  <div class="features-grid">
    {%- for block in section.blocks -%}
      {%- case block.type -%}
        {%- when 'feature' -%}
          <div class="feature-item" {{ block.shopify_attributes }}>
            <span class="feature-icon">{{ block.settings.icon }}</span>
            <div class="feature-title">{{ block.settings.title }}</div>
            <div class="feature-description">{{ block.settings.description }}</div>
          </div>
      {%- endcase -%}
    {%- endfor -%}
  </div>
</div>

{% schema %}
{
  "name": "Brand Features",
  "tag": "section",
  "class": "section",
  "settings": [
    {"type": "text", "id": "heading", "label": "Heading", "default": "Why Choose Us"},
    {"type": "text", "id": "subheading", "label": "Subheading", "default": "Quality, speed, and service — all in one place"},
    {"type": "color", "id": "background_color", "label": "Background color", "default": "#ffffff"},
    {"type": "range", "id": "columns", "min": 2, "max": 5, "step": 1, "label": "Columns (desktop)", "default": 3},
    {"type": "range", "id": "padding_top", "min": 0, "max": 100, "step": 4, "unit": "px", "label": "Padding top", "default": 60},
    {"type": "range", "id": "padding_bottom", "min": 0, "max": 100, "step": 4, "unit": "px", "label": "Padding bottom", "default": 60}
  ],
  "blocks": [
    {
      "type": "feature",
      "name": "Feature",
      "settings": [
        {"type": "text", "id": "icon", "label": "Icon (emoji)", "default": "✓"},
        {"type": "text", "id": "title", "label": "Feature title", "default": "Free Shipping"},
        {"type": "textarea", "id": "description", "label": "Description", "default": "On all orders over $75"}
      ]
    }
  ],
  "presets": [
    {
      "name": "Brand Features",
      "blocks": [
        {"type": "feature"},
        {"type": "feature"},
        {"type": "feature"}
      ]
    }
  ]
}
{% endschema %}`;

  // Promo banner with optional countdown
  const promoBanner = `{%- style -%}
  .promo-banner-section {
    background-color: {{ section.settings.background_color }};
    padding: {{ section.settings.padding_top }}px 0 {{ section.settings.padding_bottom }}px;
  }
  .promo-banner-inner {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1.5rem;
  }
  .promo-banner-content { flex: 1; min-width: 200px; }
  .promo-banner-heading {
    font-size: clamp(1.3rem, 2.5vw, 2rem);
    font-weight: 700;
    color: {{ section.settings.text_color }};
    margin-bottom: 0.5rem;
  }
  .promo-banner-subheading {
    color: {{ section.settings.text_color }};
    opacity: 0.85;
    font-size: 1rem;
  }
  .promo-banner-cta {
    flex-shrink: 0;
  }
  .promo-banner-btn {
    display: inline-block;
    padding: 0.875rem 2rem;
    background: {{ section.settings.button_color }};
    color: {{ section.settings.button_text_color }};
    text-decoration: none;
    border-radius: ${brief.style.borderRadius};
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-size: 0.85rem;
    transition: opacity 0.2s ease, transform 0.2s ease;
    border: 2px solid {{ section.settings.button_color }};
  }
  .promo-banner-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  .promo-countdown {
    display: flex;
    gap: 1rem;
    align-items: center;
    color: {{ section.settings.text_color }};
    font-weight: 600;
  }
  .countdown-unit {
    text-align: center;
    min-width: 50px;
  }
  .countdown-number {
    font-size: 1.5rem;
    display: block;
    line-height: 1;
  }
  .countdown-label {
    font-size: 0.7rem;
    opacity: 0.75;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  @media (max-width: 640px) {
    .promo-banner-inner { flex-direction: column; text-align: center; }
  }
{%- endstyle -%}

<div class="promo-banner-section">
  <div class="promo-banner-inner">
    <div class="promo-banner-content">
      <h2 class="promo-banner-heading">{{ section.settings.heading }}</h2>
      <p class="promo-banner-subheading">{{ section.settings.subheading }}</p>
    </div>
    {%- if section.settings.show_countdown -%}
    <div class="promo-countdown" id="promo-countdown" data-end="{{ section.settings.countdown_end }}">
      <div class="countdown-unit">
        <span class="countdown-number" id="cd-hours">00</span>
        <span class="countdown-label">Hours</span>
      </div>
      <div class="countdown-unit">
        <span class="countdown-number" id="cd-mins">00</span>
        <span class="countdown-label">Mins</span>
      </div>
      <div class="countdown-unit">
        <span class="countdown-number" id="cd-secs">00</span>
        <span class="countdown-label">Secs</span>
      </div>
    </div>
    <script>
      (function() {
        var el = document.getElementById('promo-countdown');
        if (!el) return;
        var end = new Date(el.dataset.end).getTime() || Date.now() + 86400000;
        var h = document.getElementById('cd-hours');
        var m = document.getElementById('cd-mins');
        var s = document.getElementById('cd-secs');
        function pad(n) { return String(n).padStart(2, '0'); }
        function tick() {
          var diff = Math.max(0, end - Date.now());
          var hrs = Math.floor(diff / 3600000);
          var min = Math.floor((diff % 3600000) / 60000);
          var sec = Math.floor((diff % 60000) / 1000);
          if (h) h.textContent = pad(hrs);
          if (m) m.textContent = pad(min);
          if (s) s.textContent = pad(sec);
        }
        tick();
        setInterval(tick, 1000);
      })();
    </script>
    {%- endif -%}
    <div class="promo-banner-cta">
      <a href="{{ section.settings.button_link }}" class="promo-banner-btn">
        {{ section.settings.button_label }}
      </a>
    </div>
  </div>
</div>

{% schema %}
{
  "name": "Promo Banner",
  "tag": "section",
  "class": "section",
  "settings": [
    {"type": "text", "id": "heading", "label": "Heading", "default": "Limited Time Offer"},
    {"type": "text", "id": "subheading", "label": "Subheading", "default": "Use code WELCOME20 for 20% off your first order"},
    {"type": "color", "id": "background_color", "label": "Background color", "default": "${palette.primary}"},
    {"type": "color", "id": "text_color", "label": "Text color", "default": "#ffffff"},
    {"type": "text", "id": "button_label", "label": "Button label", "default": "Shop Now"},
    {"type": "url", "id": "button_link", "label": "Button link"},
    {"type": "color", "id": "button_color", "label": "Button color", "default": "#ffffff"},
    {"type": "color", "id": "button_text_color", "label": "Button text color", "default": "${palette.primary}"},
    {"type": "checkbox", "id": "show_countdown", "label": "Show countdown timer", "default": false},
    {"type": "text", "id": "countdown_end", "label": "Countdown end date (ISO format)", "default": "", "info": "Example: 2025-12-31T23:59:59"},
    {"type": "range", "id": "padding_top", "min": 0, "max": 100, "step": 4, "unit": "px", "label": "Padding top", "default": 28},
    {"type": "range", "id": "padding_bottom", "min": 0, "max": 100, "step": 4, "unit": "px", "label": "Padding bottom", "default": 28}
  ],
  "blocks": [],
  "presets": [
    {
      "name": "Promo Banner",
      "settings": {
        "heading": "Limited Time Offer",
        "subheading": "Use code WELCOME20 for 20% off your first order"
      }
    }
  ]
}
{% endschema %}`;

  await fs.writeFile(path.join(sectionsDir, 'custom-testimonials.liquid'), testimonials);
  await fs.writeFile(path.join(sectionsDir, 'custom-features.liquid'), features);
  await fs.writeFile(path.join(sectionsDir, 'custom-promo-banner.liquid'), promoBanner);
}

async function patchSettingsSchema(themePath: string, brief: DesignBrief) {
  const schemaPath = path.join(themePath, 'config', 'settings_schema.json');
  await fs.ensureDir(path.join(themePath, 'config'));

  let schema: unknown[] = [];
  if (await fs.pathExists(schemaPath)) {
    try {
      schema = await fs.readJson(schemaPath);
    } catch {
      schema = [];
    }
  }

  const themeColorsSection = {
    name: 'Theme Colors',
    settings: [
      { type: 'header', content: 'Brand Colors — Generated by ShopifyThemeForge' },
      { type: 'color', id: 'color_primary', label: 'Primary color', default: brief.palette.primary },
      { type: 'color', id: 'color_secondary', label: 'Secondary color', default: brief.palette.secondary },
      { type: 'color', id: 'color_accent', label: 'Accent color', default: brief.palette.accent },
      { type: 'color', id: 'color_background', label: 'Background', default: brief.palette.background },
      { type: 'color', id: 'color_surface', label: 'Surface color', default: brief.palette.surface },
      { type: 'color', id: 'color_text', label: 'Text color', default: brief.palette.text },
      { type: 'color', id: 'color_text_muted', label: 'Muted text color', default: brief.palette.textMuted },
    ],
  };

  // Prepend our color section
  schema = [themeColorsSection, ...schema.filter((s: unknown) => (s as { name?: string }).name !== 'Theme Colors')];
  await fs.writeJson(schemaPath, schema, { spaces: 2 });
}

async function copyImagesToAssets(themePath: string, images: GeneratedImage[]) {
  const assetsDir = path.join(themePath, 'assets');
  await fs.ensureDir(assetsDir);

  // Write URL references file — actual images are referenced by URL in settings_data
  const imageManifest = images.reduce(
    (acc, img) => {
      acc[img.filename ?? img.id] = img.url;
      return acc;
    },
    {} as Record<string, string>
  );

  await fs.writeJson(path.join(assetsDir, 'image-manifest.json'), imageManifest, { spaces: 2 });
}

async function buildProductsCsv(
  themePath: string,
  products: Product[],
  images: GeneratedImage[],
  storeName: string
) {
  const rows: string[] = [
    'Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Variant Price,Variant Compare At Price,Image Src,Image Position',
  ];

  for (const product of products) {
    const mainImage = images.find(
      (i) => i.productId === product.id && (i.type === 'product-main' || i.type === 'product_main')
    );
    const handle = product.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const variants = product.variants || [];
    const opt1 = variants[0];
    const opt2 = variants[1];
    const opt1Values = opt1?.values || ['Default'];
    const opt2Values = opt2?.values || [''];

    const description = `<p>${product.longDescription.replace(/\n/g, '</p><p>')}</p>`;
    const tags = product.tags.join(', ');
    const compareAt = product.compareAtPrice || '';

    for (let i = 0; i < opt1Values.length; i++) {
      for (let j = 0; j < Math.max(1, opt2Values.length); j++) {
        const isFirst = i === 0 && j === 0;
        rows.push(
          [
            handle,
            isFirst ? `"${product.name}"` : '',
            isFirst ? `"${description}"` : '',
            isFirst ? `"${storeName}"` : '',
            isFirst ? '"Product"' : '',
            isFirst ? `"${tags}"` : '',
            isFirst ? 'TRUE' : '',
            opt1 ? opt1.option : '',
            opt1Values[i],
            opt2 ? opt2.option : '',
            opt2Values[j] || '',
            product.price.toFixed(2),
            compareAt ? compareAt.toFixed(2) : '',
            isFirst && mainImage ? mainImage.url : '',
            isFirst ? '1' : '',
          ].join(',')
        );
      }
    }
  }

  await fs.writeFile(path.join(themePath, 'products.csv'), rows.join('\n'));
}

async function buildImportGuide(themePath: string, storeName: string) {
  const guide = `# How to import your ShopifyThemeForge theme for "${storeName}"

## Step 1 — Import the theme
1. Go to your Shopify Admin
2. Click "Online Store" → "Themes"
3. Click "Add theme" → "Upload zip file"
4. Select this zip file
5. Click "Upload file"

## Step 2 — Import your products
1. Go to "Products" → "Import"
2. Upload the file \`products.csv\`
3. Click "Upload and continue" → "Import products"

## Step 3 — Set your logo
1. Click "Customize" on your theme
2. Header section → Upload your logo

## Step 4 — Customize everything
Every color, font, text and image is editable in the theme customizer.
All sections support adding/removing/reordering blocks.

## Customizable elements
- ✅ All colors (primary, secondary, accent, background, text)
- ✅ All fonts
- ✅ All images (replace AI-generated ones with your own)
- ✅ All text (headings, descriptions, button labels)
- ✅ Add/remove/reorder homepage sections
- ✅ Add testimonials blocks
- ✅ Add feature blocks
- ✅ Logo, favicon
- ✅ Footer links and content
- ✅ Navigation menu

## Troubleshooting
- If images don't show, go to Admin → Settings → Files and upload the images manually
- If fonts look different, ensure "Theme Colors" settings are saved in the customizer
- For support, visit your ShopifyThemeForge dashboard

Generated by ShopifyThemeForge on ${new Date().toLocaleDateString()}
`;

  await fs.writeFile(path.join(themePath, 'IMPORT_GUIDE.md'), guide);
}

async function createMinimalDawnStructure(themePath: string) {
  const dirs = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates'];
  for (const dir of dirs) {
    await fs.ensureDir(path.join(themePath, dir));
  }

  // Minimal theme.liquid
  await fs.writeFile(path.join(themePath, 'layout', 'theme.liquid'), getMinimalThemeLiquid());

  // Minimal locales
  await fs.writeJson(path.join(themePath, 'locales', 'en.default.json'), {
    general: { title: 'Shopify Theme' },
  });

  // Base templates
  const templates = ['product', 'collection', 'cart', 'page'];
  for (const t of templates) {
    await fs.writeJson(path.join(themePath, 'templates', `${t}.json`), {
      sections: {},
      order: [],
    });
  }
}

function getMinimalThemeLiquid(): string {
  return `<!DOCTYPE html>
<html lang="{{ request.locale.iso_code }}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ page_title }}{% if current_tags %} &ndash; tagged "{{ current_tags | join: ', ' }}"{% endif %}{% if current_page != 1 %} &ndash; Page {{ current_page }}{% endif %}{% unless page_title contains shop.name %} &ndash; {{ shop.name }}{% endunless %}</title>
  {{ content_for_header }}
</head>
<body class="gradient">
  <a class="skip-to-content-link button visually-hidden" href="#MainContent">Skip to content</a>
  <div id="shopify-section-header">
    {%- section 'header' -%}
  </div>
  <main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
    {{ content_for_layout }}
  </main>
  {%- section 'footer' -%}
  <ul hidden>
    <li id="a11y-refresh-page-message">{{ 'accessibility.refresh_page' | t }}</li>
    <li id="a11y-new-window-message">{{ 'accessibility.link_messages.new_window' | t }}</li>
  </ul>
</body>
</html>`;
}

// Generate Claude-assisted section customization for complex layouts
export async function generateClaudeSection(
  sectionType: string,
  brief: DesignBrief,
  storeName: string
): Promise<string> {
  const prompt = `Generate a complete Shopify Liquid section file for a "${sectionType}" section.
Store: ${storeName}
Design style: ${brief.style.layoutType}
Primary color: ${brief.palette.primary}
Secondary color: ${brief.palette.secondary}
Background: ${brief.palette.background}
Text color: ${brief.palette.text}

REQUIREMENTS:
- Complete Liquid template with inline {% style %} block
- All colors from section.settings.* (no hardcoded values except fallbacks)
- Valid {% schema %} JSON with name, settings, blocks (if applicable), and presets
- Mobile responsive CSS
- Smooth hover transitions
- Must have at least one preset in "presets" array

Return ONLY the Liquid code, no markdown, no explanation.`;

  return generateWithClaude(
    'You are an expert Shopify theme developer. Generate clean, valid Liquid sections with proper schema.',
    prompt,
    2048
  );
}
