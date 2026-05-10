'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Zap, Palette, Download, Star, Check } from 'lucide-react';

const STEPS = [
  {
    icon: Palette,
    title: 'Describe Your Brand',
    desc: 'Upload reference images and describe your store vision, niche, and style preferences.',
  },
  {
    icon: Zap,
    title: 'AI Builds Everything',
    desc: 'Our AI generates 15 custom images, product catalog, and all Liquid theme files in minutes.',
  },
  {
    icon: Download,
    title: 'Import & Customize',
    desc: 'Download your .zip, import to Shopify in 2 clicks. Every element is editable in the customizer.',
  },
];

const FEATURES = [
  '15 AI-generated product & hero images',
  '4 complete product listings with variants',
  'Fully customizable via Shopify Customizer',
  'Custom CSS & scroll animations',
  'Testimonials, features & promo sections',
  'products.csv ready to import',
  'Mobile-first responsive design',
  'Based on Shopify Dawn (official theme)',
];

const NICHES = [
  { label: 'Fashion', emoji: '👗' },
  { label: 'Luxury', emoji: '💎' },
  { label: 'Beauty', emoji: '💄' },
  { label: 'Sports', emoji: '⚽' },
  { label: 'Electronics', emoji: '📱' },
  { label: 'Home & Living', emoji: '🏡' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">
            <span className="gradient-text">Shopify</span>ThemeForge
          </span>
          <Link
            href="/generate"
            className="flex items-center gap-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
          >
            Generate Theme <ArrowRight size={15} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#6366f1]/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-[#6366f1]/15 text-[#a78bfa] text-sm font-medium px-4 py-1.5 rounded-full border border-[#6366f1]/30 mb-8">
              Powered by GPT-Image-2 &amp; Claude Sonnet
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-tight"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Generate{' '}
            <span className="gradient-text">Stunning</span>
            <br />
            Shopify Themes
            <br />
            with <span className="gradient-text">AI</span>
          </motion.h1>

          <motion.p
            className="mt-8 text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Upload reference images, describe your brand, and get a fully professional, importable
            Shopify theme in under 10 minutes.
          </motion.p>

          <motion.div
            className="mt-10 flex items-center justify-center gap-4 flex-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            <Link
              href="/generate"
              className="group flex items-center gap-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white px-8 py-4 rounded-xl text-lg font-bold transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]"
            >
              Generate Your Theme
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <span className="text-zinc-500 text-sm">No credit card required to try</span>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-16 flex items-center justify-center gap-12 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.75 }}
          >
            {[
              { val: '~8 min', label: 'Average generation time' },
              { val: '15', label: 'AI-generated images' },
              { val: '100%', label: 'Customizable in Shopify' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold gradient-text">{stat.val}</div>
                <div className="text-zinc-500 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              Three steps to your
              <span className="gradient-text"> perfect theme</span>
            </h2>
            <p className="text-zinc-400 text-lg">From idea to ready-to-import theme in minutes.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                className="relative glass rounded-2xl p-8 group hover:border-[#6366f1]/40 transition-all"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <div className="w-12 h-12 bg-[#6366f1]/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#6366f1]/30 transition-colors">
                  <step.icon size={22} className="text-[#6366f1]" />
                </div>
                <div className="absolute top-6 right-6 text-5xl font-black text-white/5 select-none">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                Everything included
                <br />
                <span className="gradient-text">out of the box</span>
              </h2>
              <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
                Your generated theme comes packed with everything you need to launch a professional
                Shopify store immediately.
              </p>

              <ul className="space-y-3">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-zinc-300">
                    <div className="w-5 h-5 bg-[#6366f1]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check size={11} className="text-[#6366f1]" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {NICHES.map(({ label, emoji }) => (
                <div
                  key={label}
                  className="glass rounded-xl p-6 text-center hover:border-[#6366f1]/40 transition-all cursor-default"
                >
                  <div className="text-3xl mb-2">{emoji}</div>
                  <div className="text-sm font-semibold text-zinc-300">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            <blockquote className="text-2xl md:text-3xl font-semibold text-zinc-200 leading-relaxed max-w-3xl mx-auto mb-8">
              &ldquo;ShopifyThemeForge saved me 40+ hours of design work. The AI understood my brand
              instantly and the theme was better than what I would have designed myself.&rdquo;
            </blockquote>
            <cite className="text-zinc-500 not-italic">— Sarah K., Founder of LuxeWear Paris</cite>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-3xl p-16"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
              Ready to build your
              <br />
              <span className="gradient-text">dream Shopify store?</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-10">
              Generate a fully custom, professional Shopify theme in minutes.
            </p>
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white px-10 py-5 rounded-xl text-xl font-bold transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(99,102,241,0.4)]"
            >
              Start Generating
              <ArrowRight size={22} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <span className="font-bold text-lg">
            <span className="gradient-text">Shopify</span>ThemeForge
          </span>
          <p className="text-zinc-600 text-sm">
            &copy; {new Date().getFullYear()} ShopifyThemeForge. Not affiliated with Shopify Inc.
          </p>
        </div>
      </footer>
    </main>
  );
}
