import type { NextFunction, Request, Response } from 'express';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { locationService } from './location.service';

export const suggestAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = String(req.query.q || '');
    const serviceResponse = await locationService.suggestAddresses(query);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
