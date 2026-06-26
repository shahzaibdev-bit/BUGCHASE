import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { API_URL } from '@/config';

let stripePromise: Promise<Stripe | null> | null = null;

function readEnvPublishableKey(): string {
  return String(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? '').trim();
}

async function fetchPublishableKeyFromApi(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/public/stripe-config`);
    if (!res.ok) return '';
    const data = await res.json();
    return String(data?.data?.publishableKey ?? '').trim();
  } catch {
    return '';
  }
}

export async function resolvePublishableKey(): Promise<string> {
  const envKey = readEnvPublishableKey();
  if (envKey) return envKey;
  return fetchPublishableKeyFromApi();
}

/** Cached Stripe.js loader — safe to pass directly to `<Elements stripe={...}>`. */
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = (async () => {
      const key = await resolvePublishableKey();
      if (!key) return null;
      return loadStripe(key);
    })();
  }
  return stripePromise;
}

export async function ensureStripeReady(): Promise<Stripe | null> {
  const stripe = await getStripePromise();
  return stripe;
}

/** Shared Payment Element options — card only, no Link / wallet buttons. */
export const STRIPE_PAYMENT_ELEMENT_OPTIONS = {
  layout: 'tabs' as const,
  wallets: {
    applePay: 'never' as const,
    googlePay: 'never' as const,
    link: 'never' as const,
  },
};
