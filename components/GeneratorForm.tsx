'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, ChevronDown } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { cn } from '@/lib/utils';

const NICHES = ['Fashion', 'Streetwear', 'Luxury', 'Beauty', 'Sports', 'Electronics', 'Home', 'Food', 'Other'];
const COLOR_MOODS = ['Warm', 'Cool', 'Neutral', 'Dark', 'Bright'];
const LAYOUT_STYLES = ['Minimal', 'Bold', 'Editorial', 'Luxury', 'Playful'];
const ANIMATION_LEVELS = ['Subtle', 'Dynamic', 'Intense'];

const PROMPT_EXAMPLES = [
  'A premium streetwear brand with urban vibes, dark tones, and bold typography',
  'Luxury skincare brand with clean whites, gold accents, and elegant serif fonts',
  'Eco-friendly outdoor gear store with earthy greens and a nature-inspired aesthetic',
];

export default function GeneratorForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [storeName, setStoreName] = useState('');
  const [niche, setNiche] = useState('');
  const [prompt, setPrompt] = useState('');
  const [colorMood, setColorMood] = useState('');
  const [layoutStyle, setLayoutStyle] = useState('');
  const [animationLevel, setAnimationLevel] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const canSubmit = storeName.trim() && niche && prompt.trim().length >= 10 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          niche,
          prompt,
          colorMood: colorMood || undefined,
          layoutStyle: layoutStyle || undefined,
          animationLevel: animationLevel || undefined,
          referenceImages,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start generation');

      router.push(`/result/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Store name */}
      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-2">
          Store Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="e.g. UrbanEdge, LuxeWear, NaturePure..."
          maxLength={100}
          className="w-full bg-[#141414] border border-[#2a2a2a] text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none transition-all"
        />
      </div>

      {/* Niche */}
      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-2">
          Niche <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {NICHES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNiche(n)}
              className={cn(
                'px-3 py-2.5 rounded-lg text-sm font-medium border transition-all',
                niche === n
                  ? 'bg-[#6366f1]/20 border-[#6366f1] text-white'
                  : 'bg-[#141414] border-[#2a2a2a] text-zinc-400 hover:border-[#6366f1]/50'
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-2">
          Describe Your Theme <span className="text-red-400">*</span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={PROMPT_EXAMPLES[0]}
          className="w-full bg-[#141414] border border-[#2a2a2a] text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none transition-all resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-zinc-600">Minimum 10 characters</p>
          <span className="text-xs text-zinc-600">{prompt.length}/2000</span>
        </div>
        {/* Example prompts */}
        <div className="mt-2 flex flex-wrap gap-2">
          {PROMPT_EXAMPLES.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrompt(ex)}
              className="text-xs text-zinc-600 hover:text-[#6366f1] transition-colors underline underline-offset-2"
            >
              Example {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Reference images */}
      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-2">
          Reference Images <span className="text-zinc-600">(optional)</span>
        </label>
        <ImageUploader onImagesChange={setReferenceImages} maxImages={5} />
      </div>

      {/* Advanced options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ChevronDown
            size={16}
            className={cn('transition-transform', showAdvanced && 'rotate-180')}
          />
          Style Preferences (optional)
        </button>

        {showAdvanced && (
          <motion.div
            className="mt-4 space-y-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Color mood */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
                Color Mood
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_MOODS.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setColorMood(colorMood === mood ? '' : mood)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm border transition-all',
                      colorMood === mood
                        ? 'bg-[#6366f1]/20 border-[#6366f1] text-white'
                        : 'bg-[#141414] border-[#2a2a2a] text-zinc-500 hover:border-[#6366f1]/40'
                    )}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout style */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
                Layout Style
              </label>
              <div className="flex flex-wrap gap-2">
                {LAYOUT_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setLayoutStyle(layoutStyle === style ? '' : style)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm border transition-all',
                      layoutStyle === style
                        ? 'bg-[#6366f1]/20 border-[#6366f1] text-white'
                        : 'bg-[#141414] border-[#2a2a2a] text-zinc-500 hover:border-[#6366f1]/40'
                    )}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Animation level */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
                Animation Level
              </label>
              <div className="flex flex-wrap gap-2">
                {ANIMATION_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setAnimationLevel(animationLevel === level ? '' : level)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm border transition-all',
                      animationLevel === level
                        ? 'bg-[#6366f1]/20 border-[#6366f1] text-white'
                        : 'bg-[#141414] border-[#2a2a2a] text-zinc-500 hover:border-[#6366f1]/40'
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/50 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold transition-all',
          canSubmit
            ? 'bg-[#6366f1] hover:bg-[#4f46e5] text-white hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]'
            : 'bg-[#1a1a1a] text-zinc-600 cursor-not-allowed'
        )}
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Starting generation...
          </>
        ) : (
          <>
            <Sparkles size={18} />
            Generate Theme
          </>
        )}
      </button>
    </form>
  );
}
