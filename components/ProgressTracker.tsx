'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressTrackerProps {
  progress: number;
  currentStep: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}

const PIPELINE_STEPS = [
  { label: 'Analyzing references', range: [0, 20] },
  { label: 'Generating product catalog', range: [20, 35] },
  { label: 'Creating product images', range: [35, 75] },
  { label: 'Building theme files', range: [75, 92] },
  { label: 'Packaging theme', range: [92, 100] },
];

function getStepStatus(
  step: { range: number[] },
  progress: number,
  status: string
): 'done' | 'active' | 'pending' {
  if (status === 'COMPLETED') return 'done';
  if (progress >= step.range[1]) return 'done';
  if (progress >= step.range[0]) return 'active';
  return 'pending';
}

function getETA(progress: number): string {
  if (progress === 0) return '~8 min';
  const remaining = 100 - progress;
  const totalMinutes = 8;
  const remainingMinutes = Math.ceil((remaining / 100) * totalMinutes);
  if (remainingMinutes <= 1) return '< 1 min';
  return `~${remainingMinutes} min`;
}

export default function ProgressTracker({ progress, currentStep, status }: ProgressTrackerProps) {
  return (
    <div className="space-y-6">
      {/* Overall progress bar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-zinc-300">
            {status === 'COMPLETED'
              ? 'Theme ready!'
              : status === 'FAILED'
              ? 'Generation failed'
              : `Generating... ${progress}%`}
          </span>
          {status === 'RUNNING' && (
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Clock size={12} />
              {getETA(progress)} remaining
            </span>
          )}
        </div>
        <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full',
              status === 'FAILED'
                ? 'bg-red-500'
                : status === 'COMPLETED'
                ? 'bg-green-500'
                : 'bg-[#6366f1]'
            )}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-3">
        {PIPELINE_STEPS.map((step, i) => {
          const stepStatus = getStepStatus(step, progress, status);
          const isActive = stepStatus === 'active';

          return (
            <motion.div
              key={step.label}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              {/* Status icon */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs',
                  stepStatus === 'done' && 'bg-green-500/20 text-green-400',
                  isActive && 'bg-[#6366f1]/20 text-[#6366f1]',
                  stepStatus === 'pending' && 'bg-white/5 text-zinc-600'
                )}
              >
                {stepStatus === 'done' ? (
                  <Check size={12} />
                ) : isActive ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-sm transition-colors',
                  stepStatus === 'done' && 'text-green-400',
                  isActive && 'text-white font-medium',
                  stepStatus === 'pending' && 'text-zinc-600'
                )}
              >
                {step.label}
                {isActive && step.label.includes('images') && progress > 35 && (
                  <span className="ml-2 text-xs text-zinc-500">
                    ({Math.round(((progress - 35) / 40) * 15)}/15)
                  </span>
                )}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Current step detail */}
      <AnimatePresence mode="wait">
        {currentStep && status === 'RUNNING' && (
          <motion.div
            key={currentStep}
            className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#6366f1] rounded-full animate-pulse" />
              <span className="text-xs text-zinc-400 font-mono">{currentStep}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Failure message */}
      {status === 'FAILED' && (
        <div className="bg-red-950/50 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm font-medium">Generation failed</p>
          <p className="text-red-400/70 text-xs mt-1">{currentStep}</p>
        </div>
      )}
    </div>
  );
}
