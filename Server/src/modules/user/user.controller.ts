import type { NextFunction, Request, Response } from '@/types/http';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { userCommands } from './commands/user.commands';
import { userQueries } from './queries/user.queries';

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;

    const serviceResponse = await userQueries.findById(uid);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const editUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;
    const update = req.body;

    const serviceResponse = await userCommands.update(uid, update);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;

    const serviceResponse = await userQueries.getFavorites(uid, req.query as unknown as { page: number; limit: number });
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;
    const { apartmentId } = req.params;

    const serviceResponse = await userCommands.toggleFavorite(uid, apartmentId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const markHostWelcomeSeen = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;

    const serviceResponse = await userCommands.markHostWelcomeSeen(uid);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
