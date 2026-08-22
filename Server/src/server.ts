import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { Express } from 'express';
import express from 'express';
import helmet from 'helmet';
import { pino } from 'pino';

import { dbConnect } from '@/config/db.config';
import { env } from '@/config/env.config';
import passport from '@/config/passport.config';
import errorHandler from '@/middlewares/errorHandler';
import rateLimiter from '@/middlewares/rateLimiter';
import requestLogger from '@/middlewares/requestLogger';
import initRoutes from '@/routes';
import { initApartmentIndex } from '@/services/apartmentSearch.service';

const logger = pino({ name: 'server start' });
const app: Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', true);

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(compression());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
dbConnect();
initApartmentIndex();
app.use(passport.initialize());
app.use(rateLimiter);
app.use(requestLogger);

initRoutes(app);

app.use(errorHandler());

export { app, logger };
