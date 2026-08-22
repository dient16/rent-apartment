import Stripe from 'stripe';

import { env } from '@/config/env.config';

/** Stripe client dung chung, khoi tao mot lan cho ca app. */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY);
