import Stripe from 'stripe';

import AppError from './AppError';

let stripeClient: any = null;

export function getStripeClient(apiVersion: string = '2023-10-16'): any {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new AppError('Stripe is not configured. Set STRIPE_SECRET_KEY in the server environment.', 503);
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: apiVersion as any,
    });
  }

  return stripeClient;
}
