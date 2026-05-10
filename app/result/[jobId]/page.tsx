'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProgressTracker from '@/components/ProgressTracker';
import ResultCard from '@/components/ResultCard';
import type { GeneratedImage } from '@/lib/validators/theme';

interface JobData {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep?: string;
  storeName: string;
  niche: string;
  zipUrl?: string;
  zipSize?: number;
  generatedImages?: GeneratedImage[];
  error?: string;
}

export default function ResultPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobData | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setJob(data);
    } catch {
      // Network error — retry
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Poll while pending/running
  useEffect(() => {
    if (!job || job.status === 'COMPLETED' || job.status === 'FAILED') return;

    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [job, fetchJob]);

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job not found</h1>
          <Link href="/generate" className="text-[#6366f1] hover:underline">
            Generate a new theme
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link
            href="/generate"
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

      <div className="max-w-4xl mx-auto px-6 py-12">
        {!job ? (
          // Loading skeleton
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-zinc-500">Loading job status...</p>
            </div>
          </div>
        ) : job.status === 'COMPLETED' ? (
          <ResultCard job={job as Parameters<typeof ResultCard>[0]['job']} />
        ) : (
          // In progress
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-2xl font-extrabold mb-2">
                Building <span className="gradient-text">{job.storeName}</span>
              </h1>
              <p className="text-zinc-500 text-sm">
                Job ID: <code className="text-zinc-400">{job.id}</code>
              </p>
              <p className="text-zinc-600 text-xs mt-1">
                Bookmark this page — you can return to check the status anytime
              </p>
            </div>

            <div className="glass rounded-2xl p-8">
              <ProgressTracker
                progress={job.progress}
                currentStep={job.currentStep || job.error || ''}
                status={job.status}
              />
            </div>

            {job.status === 'PENDING' && (
              <p className="text-center text-xs text-zinc-600 mt-6">
                Generation will start shortly...
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
