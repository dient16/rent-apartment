import type { NextFunction, Request, Response } from '@/types/http';

import { amenityCommands } from './commands/amenity.commands';
import { amenityQueries } from './queries/amenity.queries';

export const createAmenity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    const icon = req?.file?.filename;
    const amenityResponse = await amenityCommands.createAmenity(name, description, icon);

    amenityResponse.send(res);
  } catch (error) {
    return next(error);
  }
};

export const getAmenities = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const amenityResponse = await amenityQueries.getAmenities();
    amenityResponse.send(res);
  } catch (error) {
    return next(error);
  }
};

export const updateAmenity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { aid } = req.params;
    const { name, description, icon } = req.body;
    const amenityResponse = await amenityCommands.updateAmenity(aid, name, description, icon);

    amenityResponse.send(res);
  } catch (error) {
    return next(error);
  }
};

export const deleteAmenity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { aid } = req.params;
    const amenityResponse = await amenityCommands.deleteAmenity(aid);

    amenityResponse.send(res);
  } catch (error) {
    return next(error);
  }
};
