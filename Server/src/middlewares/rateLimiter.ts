import { rateLimit } from 'express-rate-limit';

import { env } from '@/config/env.config';

const rateLimiter = rateLimit({
  legacyHeaders: true,
  limit: env.COMMON_RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  windowMs: 15 * 60 * env.COMMON_RATE_LIMIT_WINDOW_MS,
  // express-rate-limit v8 rejects a custom keyGenerator that reads `req.ip` directly
  // because it does not collapse IPv6 subnets. The built-in default already keys on the
  // IP through `ipKeyGenerator`, which is exactly what this used to do.
});

export default rateLimiter;
