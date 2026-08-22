import type { Application } from 'express';

import { amenityRouter } from '@/api/amenity/amenity.router';
import { apartmentRouter } from '@/api/apartment/apartment.router';
import { authRouter } from '@/api/auth/auth.router';
import { bookingRouter } from '@/api/booking/booking.router';
import { healthRouter } from '@/api/health/health.router';
import { imageRouter } from '@/api/image/image.router';
import { paymentRouter } from '@/api/payment/payment.router';
import { pricingRouter } from '@/api/pricing/pricing.router';
import { roomRouter } from '@/api/room/room.router';
import { userRouter } from '@/api/user/user.router';

import { swaggerRouter } from './swagger.router';

const initRoutes = (app: Application) => {
  app.use('/health-check', healthRouter);
  app.use('/api-docs', swaggerRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/user', userRouter);
  app.use('/api/amenity', amenityRouter);
  app.use('/api/image', imageRouter);
  app.use('/api/apartment', apartmentRouter);
  app.use('/api/booking', bookingRouter);
  app.use('/api/payment', paymentRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/room', roomRouter);
};

export default initRoutes;
