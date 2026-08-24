import type { NextFunction, Request, Response } from 'express';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { locationQueries } from './queries/location.queries';

export const suggestAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = String(req.query.q || '');
    const serviceResponse = await locationQueries.suggestAddresses(query);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const geocode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = String(req.query.q || '');
    const serviceResponse = await locationQueries.geocode(query);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const reverseGeocode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceResponse = await locationQueries.reverseGeocode(Number(req.query.lat), Number(req.query.lon));
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
