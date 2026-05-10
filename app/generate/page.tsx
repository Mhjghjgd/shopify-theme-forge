import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import GeneratorForm from '@/components/GeneratorForm';

export const metadata: Metadata = {
  title: 'Generate Theme — ShopifyThemeForge',
  description: 'Create your AI-powered Shopify theme in minutes.',
};

export default function GeneratePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <span className="text-zinc-700">|</span>
          <span className="font-bold">
            <span className="gradient-text">Shopify</span>ThemeForge
          </span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            Generate Your{' '}
            <span className="gradient-text">Shopify Theme</span>
          </h1>
          <p className="text-zinc-400">
            Fill in your brand details below. The AI will generate a complete, importable Shopify
            theme in ~8 minutes.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr,380px] gap-8 items-start">
          {/* Form */}
          <div className="glass rounded-2xl p-8">
            <GeneratorForm />
          </div>

          {/* Info sidebar */}
          <div className="space-y-4 sticky top-8">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-zinc-500">
                What you get
              </h3>
              <ul className="space-y-2.5">
                {[
                  '15 AI-generated images',
                  '4 products with variants',
                  'Custom CSS animations',
                  'Testimonials section',
                  'Features section',
                  'Promo banner',
                  'products.csv',
                  'Import guide',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-zinc-400">
                    <span className="w-4 h-4 bg-[#6366f1]/20 rounded-full flex items-center justify-center text-[#6366f1] text-[10px] flex-shrink-0">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-zinc-500">
                Estimated time
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  { step: 'Analyze references', time: '~1 min' },
                  { step: 'Generate catalog', time: '~1 min' },
                  { step: 'Generate images (×15)', time: '~4 min' },
                  { step: 'Build theme', time: '~1 min' },
                  { step: 'Package .zip', time: '~30 sec' },
                ].map(({ step, time }) => (
                  <div key={step} className="flex justify-between text-zinc-500">
                    <span>{step}</span>
                    <span className="text-zinc-400">{time}</span>
                  </div>
                ))}
                <div className="border-t border-[#2a2a2a] pt-2 flex justify-between font-semibold text-zinc-300">
                  <span>Total</span>
                  <span>~8 min</span>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <p className="text-xs text-zinc-600 leading-relaxed">
                Your theme is built on Shopify Dawn, the official open-source theme. All generated
                content can be replaced or customized at any time through the Shopify Customizer —
                no code required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
