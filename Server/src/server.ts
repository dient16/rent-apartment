import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { Express } from 'express';
import express from 'express';
import helmet from 'helmet';

import { logger } from '@/utils/logger';
import { dbConnect } from '@/config/db.config';
import { env } from '@/config/env.config';
import passport from '@/config/passport.config';
import errorHandler from '@/middlewares/errorHandler';
import rateLimiter from '@/middlewares/rateLimiter';
import requestLogger from '@/middlewares/requestLogger';
import initRoutes from '@/routes';
import { initApartmentIndex } from '@/services/apartmentSearch.service';

const app: Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Never `true`: a spoofed X-Forwarded-For would bypass the rate limiter.
const trustProxy = /^\d+$/.test(env.TRUST_PROXY)
  ? Number(env.TRUST_PROXY) || false
  : env.TRUST_PROXY;
app.set('trust proxy', trustProxy);
// Keep Express 4 query semantics: `roomIds[]=a&roomIds[]=b` -> array.
app.set('query parser', 'extended');

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(compression());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
// Fire-and-forget startup work; catch keeps failures readable.
dbConnect().catch((error) => logger.fatal({ err: error }, 'Database connection failed'));
initApartmentIndex().catch((error) => logger.error({ err: error }, 'Elasticsearch index init failed'));
app.use(passport.initialize());
app.use(rateLimiter);
app.use(requestLogger);

initRoutes(app);

app.use(errorHandler());

export { app, logger };
