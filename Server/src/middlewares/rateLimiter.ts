import { rateLimit } from 'express-rate-limit';

import { env } from '@/config/env.config';

const rateLimiter = rateLimit({
  legacyHeaders: true,
  limit: env.COMMON_RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  windowMs: 15 * 60 * env.COMMON_RATE_LIMIT_WINDOW_MS,
  // Default keyGenerator already keys on IP and collapses IPv6 subnets.
});

export default rateLimiter;
