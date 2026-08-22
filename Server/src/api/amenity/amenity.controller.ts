import type { NextFunction, Request, Response } from 'express';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { amenityService } from './amenity.service';

export const createAmenity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    const icon = req?.file?.filename;
    const amenityResponse = await amenityService.createAmenity(name, description, icon);

    handleServiceResponse(amenityResponse, res);
  } catch (error) {
    return next(error);
  }
};

export const getAmenities = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const amenityResponse = await amenityService.getAmenities();
    handleServiceResponse(amenityResponse, res);
  } catch (error) {
    return next(error);
  }
};

export const updateAmenity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { aid } = req.params;
    const { name, description, icon } = req.body;
    const amenityResponse = await amenityService.updateAmenity(aid, name, description, icon);

    handleServiceResponse(amenityResponse, res);
  } catch (error) {
    return next(error);
  }
};

export const deleteAmenity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { aid } = req.params;
    const amenityResponse = await amenityService.deleteAmenity(aid);

    handleServiceResponse(amenityResponse, res);
  } catch (error) {
    return next(error);
  }
};
