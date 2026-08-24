import type { NextFunction, Request, Response } from '@/types/http';

import { pricingCommands } from './commands/pricing.commands';
import { pricingQueries } from './queries/pricing.queries';

export const updatePricing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId, date, price } = req.body;

    const serviceResponse = await pricingCommands.updatePricing(roomId, new Date(date), price);

    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};
export const getPricingByRoomId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;

    const serviceResponse = await pricingQueries.getPricingByRoomId(roomId);

    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};
