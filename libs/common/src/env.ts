const INSECURE_JWT = new Set(['change-me-in-production', 'change-me', 'secret']);

/** Production da majburiy env o'zgaruvchilarni tekshiradi. */
export function assertProductionEnv(required: string[]): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Production uchun env sozlanmagan: ${missing.join(', ')}`,
    );
  }

  const jwt = process.env.JWT_SECRET?.trim() ?? '';
  if (jwt.length < 32 || INSECURE_JWT.has(jwt)) {
    throw new Error(
      'Production uchun JWT_SECRET kamida 32 belgili tasodifiy satr bo\'lishi kerak.',
    );
  }

  const adminPass = process.env.ADMIN_DEFAULT_PASSWORD?.trim() ?? '';
  if (adminPass === 'admin123' || adminPass.length < 8) {
    // eslint-disable-next-line no-console
    console.warn(
      '⚠️ ADMIN_DEFAULT_PASSWORD zaif yoki standart — Render Environment da almashtiring.',
    );
  }
}

/** Ishlab chiqarishda Redis URL majburiy (localhost fallback ishlatilmaydi). */
export function redisUrlFromEnv(): string {
  const url = process.env.REDIS_URL?.trim();
  if (url) return url;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production uchun REDIS_URL sozlanmagan.');
  }
  return 'redis://localhost:6379';
}
