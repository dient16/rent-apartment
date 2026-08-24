import type { NextFunction, Request, Response } from '@/types/http';

import { userCommands } from './commands/user.commands';
import { userQueries } from './queries/user.queries';

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;

    const serviceResponse = await userQueries.findById(uid);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const editUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;
    const update = req.body;

    const serviceResponse = await userCommands.update(uid, update);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;

    const serviceResponse = await userQueries.getFavorites(
      uid,
      req.query as unknown as { page: number; limit: number }
    );
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;
    const { apartmentId } = req.params;

    const serviceResponse = await userCommands.toggleFavorite(uid, apartmentId);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const markHostWelcomeSeen = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: uid } = req.user as UserDecode;

    const serviceResponse = await userCommands.markHostWelcomeSeen(uid);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};
