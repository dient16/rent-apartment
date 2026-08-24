import type { NextFunction, Request, Response } from 'express';

import { locationQueries } from './queries/location.queries';

export const suggestAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = String(req.query.q || '');
    const serviceResponse = await locationQueries.suggestAddresses(query);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const geocode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = String(req.query.q || '');
    const serviceResponse = await locationQueries.geocode(query);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const reverseGeocode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceResponse = await locationQueries.reverseGeocode(Number(req.query.lat), Number(req.query.lon));
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};
