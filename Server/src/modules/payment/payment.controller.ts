import type { NextFunction, Request, Response } from 'express';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { paymentCommands } from './commands/payment.commands';

export const createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, description } = req.body;
    const serviceResponse = await paymentCommands.createPaymentIntent(amount, description);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
