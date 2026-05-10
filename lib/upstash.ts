import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { Client as QStashClient, Receiver } from '@upstash/qstash';

// Lazy singletons — instantiated on first use to avoid build-time errors
let _redis: Redis | null = null;
let _ratelimit: Ratelimit | null = null;
let _qstash: QStashClient | null = null;
let _qstashReceiver: Receiver | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

export function getRatelimit(): Ratelimit {
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'shopify-theme-forge',
    });
  }
  return _ratelimit;
}

export function getQStash(): QStashClient {
  if (!_qstash) {
    _qstash = new QStashClient({ token: process.env.QSTASH_TOKEN! });
  }
  return _qstash;
}

export function getQStashReceiver(): Receiver {
  if (!_qstashReceiver) {
    _qstashReceiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
    });
  }
  return _qstashReceiver;
}

// Named exports for backwards compatibility
export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    return (getRedis() as unknown as Record<string, unknown>)[prop as string];
  },
});

export const ratelimit = new Proxy({} as Ratelimit, {
  get(_, prop) {
    return (getRatelimit() as unknown as Record<string, unknown>)[prop as string];
  },
});

export async function verifyQStashSignature(req: Request): Promise<boolean> {
  const signature = req.headers.get('upstash-signature');
  if (!signature) return false;
  try {
    const body = await req.text();
    await getQStashReceiver().verify({ signature, body });
    return true;
  } catch {
    return false;
  }
}

export async function publishToQStash(url: string, body: unknown, delaySecs = 0): Promise<string> {
  const res = await getQStash().publishJSON({
    url,
    body,
    delay: delaySecs,
    retries: 3,
  });
  return res.messageId;
}

export async function acquireJobLock(jobId: string, ttlSecs = 600): Promise<boolean> {
  const key = `lock:job:${jobId}`;
  const result = await getRedis().set(key, '1', { nx: true, ex: ttlSecs });
  return result === 'OK';
}

export async function releaseJobLock(jobId: string): Promise<void> {
  await getRedis().del(`lock:job:${jobId}`);
}
