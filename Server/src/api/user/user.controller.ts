import type { NextFunction, Request, Response } from 'express';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { userService } from './user.service';

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;

    const serviceResponse = await userService.findById(uid);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const editUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;
    const update = req.body;

    const serviceResponse = await userService.update(uid, update);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;

    const serviceResponse = await userService.getFavorites(uid);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;
    const { apartmentId } = req.params;

    const serviceResponse = await userService.toggleFavorite(uid, apartmentId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const markHostWelcomeSeen = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;

    const serviceResponse = await userService.markHostWelcomeSeen(uid);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
