import type { NextFunction, Request, Response } from '@/types/http';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { pricingCommands } from './commands/pricing.commands';
import { pricingQueries } from './queries/pricing.queries';

export const updatePricing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId, date, price } = req.body;

    const serviceResponse = await pricingCommands.updatePricing(roomId, new Date(date), price);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
export const getPricingByRoomId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;

    const serviceResponse = await pricingQueries.getPricingByRoomId(roomId);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
