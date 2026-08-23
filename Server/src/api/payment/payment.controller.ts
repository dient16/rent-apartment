import type { NextFunction, Request, Response } from 'express';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { paymentService } from './payment.service';

export const createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, description } = req.body;
    const serviceResponse = await paymentService.createPaymentIntent(amount, description);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
