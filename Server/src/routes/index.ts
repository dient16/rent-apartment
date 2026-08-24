import type { Application } from 'express';

import { amenityRouter } from '@/modules/amenity/amenity.router';
import { apartmentRouter } from '@/modules/apartment/apartment.router';
import { authRouter } from '@/modules/auth/auth.router';
import { bookingRouter } from '@/modules/booking/booking.router';
import { healthRouter } from '@/modules/health/health.router';
import { imageRouter } from '@/modules/image/image.router';
import { locationRouter } from '@/modules/location/location.router';
import { messageRouter } from '@/modules/message/message.router';
import { notificationRouter } from '@/modules/notification/notification.router';
import { paymentRouter } from '@/modules/payment/payment.router';
import { pricingRouter } from '@/modules/pricing/pricing.router';
import { reviewRouter } from '@/modules/review/review.router';
import { roomRouter } from '@/modules/room/room.router';
import { userRouter } from '@/modules/user/user.router';

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
