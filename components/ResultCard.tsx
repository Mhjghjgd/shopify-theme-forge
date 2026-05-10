'use client';

import { motion } from 'framer-motion';
import { Download, ExternalLink, RefreshCw, Package, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { GeneratedImage } from '@/lib/validators/theme';

interface Job {
  id: string;
  storeName: string;
  niche: string;
  zipUrl?: string;
  zipSize?: number;
  generatedImages?: GeneratedImage[];
}

interface ResultCardProps {
  job: Job;
}

const IMPORT_STEPS = [
  { step: 1, title: 'Upload the theme', desc: 'Shopify Admin → Online Store → Themes → Add theme → Upload zip file' },
  { step: 2, title: 'Import products', desc: 'Products → Import → Upload products.csv → Continue' },
  { step: 3, title: 'Set your logo', desc: 'Customize → Header → Upload your logo image' },
  { step: 4, title: 'Customize everything', desc: 'Every color, font, text and image is editable in the Shopify Customizer' },
];

export default function ResultCard({ job }: ResultCardProps) {
  const images = job.generatedImages || [];
  const heroImage = images.find((i) => i.type === 'hero');
  const productImages = images.filter((i) => i.type === 'product-main').slice(0, 4);
  const sizeMb = job.zipSize ? (job.zipSize / 1024 / 1024).toFixed(1) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 bg-green-500/15 text-green-400 px-4 py-2 rounded-full border border-green-500/30 mb-6">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Theme Ready
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{job.storeName}</h1>
        <p className="text-zinc-400">
          {job.niche} theme · {images.length} images generated
          {sizeMb && ` · ${sizeMb} MB`}
        </p>
      </motion.div>

      {/* Download button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <a
          href={`/api/download/${job.id}`}
          className="inline-flex items-center gap-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white px-10 py-5 rounded-xl text-lg font-bold transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]"
        >
          <Download size={22} />
          Download .zip Theme
          {sizeMb && <span className="text-sm opacity-70">({sizeMb} MB)</span>}
        </a>
        <p className="text-zinc-600 text-sm mt-3">
          Import directly into Shopify in under 2 minutes
        </p>
      </motion.div>

      {/* Hero image preview */}
      {heroImage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl overflow-hidden border border-[#2a2a2a] aspect-video relative"
        >
          <Image
            src={heroImage.url}
            alt="Hero image"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 80vw"
          />
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
            Hero Image
          </div>
        </motion.div>
      )}

      {/* Product images grid */}
      {productImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon size={16} className="text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Generated Product Images
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {productImages.map((img, i) => (
              <div
                key={img.id}
                className="aspect-square rounded-xl overflow-hidden border border-[#2a2a2a] relative group"
              >
                <Image
                  src={img.url}
                  alt={`Product ${i + 1}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="200px"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-3 text-center">
            {images.length} images total — all included in your .zip
          </p>
        </motion.div>
      )}

      {/* Theme info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Package size={16} className="text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Theme Contents
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Base theme', value: 'Shopify Dawn v15' },
            { label: 'Custom sections', value: '3 (testimonials, features, promo)' },
            { label: 'Product images', value: `${images.filter(i => i.type.startsWith('product')).length} images` },
            { label: 'Hero images', value: `${images.filter(i => i.type === 'hero' || i.type === 'banner').length} images` },
            { label: 'Products CSV', value: '4 products with variants' },
            { label: 'Zip size', value: sizeMb ? `${sizeMb} MB` : 'Unknown' },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <span className="text-zinc-600 text-xs">{label}</span>
              <span className="text-zinc-300 font-medium">{value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Import instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-lg font-bold mb-4">How to import</h2>
        <div className="space-y-3">
          {IMPORT_STEPS.map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4 glass rounded-xl p-4">
              <div className="w-8 h-8 bg-[#6366f1]/20 text-[#6366f1] rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                {step}
              </div>
              <div>
                <p className="font-semibold text-sm text-zinc-200">{title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Secondary CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center pt-4"
      >
        <Link
          href="/generate"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          <RefreshCw size={14} />
          Generate another theme
        </Link>
      </motion.div>
    </div>
  );
}
