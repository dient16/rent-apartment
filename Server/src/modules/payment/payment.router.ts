import express from 'express';

import { createPaymentIntent } from '@/modules/payment/payment.controller';
import { createPaymentIntentSchema } from '@/modules/payment/payment.dto';
import { validateRequest } from '@/utils/httpHandlers';

const router = express.Router();

router.post('/create-payment-intent', validateRequest(createPaymentIntentSchema), createPaymentIntent);

export const paymentRouter = router;
