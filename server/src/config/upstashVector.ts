import { Index } from '@upstash/vector';

let index: Index | null = null;

/**
 * Upstash Vector index for report duplicate detection.
 * Requires UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN in server/.env
 */
export const getUpstashVectorIndex = (): Index => {
  if (index) return index;

  const url = process.env.UPSTASH_VECTOR_REST_URL?.trim();
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN?.trim();

  if (!url || !token) {
    throw new Error(
      'Upstash Vector is not configured. Set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN in server/.env',
    );
  }

  index = new Index({ url, token });
  return index;
};
