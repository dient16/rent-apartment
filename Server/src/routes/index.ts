import type { Application } from 'express';

import { amenityRouter } from '@/api/amenity/amenity.router';
import { apartmentRouter } from '@/api/apartment/apartment.router';
import { authRouter } from '@/api/auth/auth.router';
import { bookingRouter } from '@/api/booking/booking.router';
import { healthRouter } from '@/api/health/health.router';
import { imageRouter } from '@/api/image/image.router';
import { locationRouter } from '@/api/location/location.router';
import { messageRouter } from '@/api/message/message.router';
import { notificationRouter } from '@/api/notification/notification.router';
import { paymentRouter } from '@/api/payment/payment.router';
import { pricingRouter } from '@/api/pricing/pricing.router';
import { reviewRouter } from '@/api/review/review.router';
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
  app.use('/api/location', locationRouter);
  app.use('/api/message', messageRouter);
  app.use('/api/notification', notificationRouter);
  app.use('/api/review', reviewRouter);
  app.use('/api/apartment', apartmentRouter);
  app.use('/api/booking', bookingRouter);
  app.use('/api/payment', paymentRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/room', roomRouter);
};

export default initRoutes;
