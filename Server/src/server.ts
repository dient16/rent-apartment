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
// `true` would trust any X-Forwarded-For header, so a client could hand us whatever IP
// it liked and bypass the rate limiter entirely. Configure the real topology instead.
const trustProxy = /^\d+$/.test(env.TRUST_PROXY)
  ? Number(env.TRUST_PROXY) || false
  : env.TRUST_PROXY;
app.set('trust proxy', trustProxy);
// Express 5 switched the default query parser to 'simple', which no longer turns
// `roomIds[]=a&roomIds[]=b` into an array. This codebase was written against the
// Express 4 default, so keep qs semantics.
app.set('query parser', 'extended');

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(compression());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
// Fire-and-forget startup work: without a catch a failure here surfaces as an
// unhandled rejection instead of a readable log line.
dbConnect().catch((error) => logger.fatal({ err: error }, 'Database connection failed'));
initApartmentIndex().catch((error) => logger.error({ err: error }, 'Elasticsearch index init failed'));
app.use(passport.initialize());
app.use(rateLimiter);
app.use(requestLogger);

initRoutes(app);

app.use(errorHandler());

export { app, logger };
