import Stripe from 'stripe';

import { env } from '@/config/env.config';

/** Shared Stripe client, created once for the app. */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY);
