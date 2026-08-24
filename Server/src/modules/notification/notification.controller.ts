import type { NextFunction, Request, Response } from '@/types/http';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { notificationCommands } from './commands/notification.commands';
import { notificationQueries } from './queries/notification.queries';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const filter = (req.query.filter as 'all' | 'unread' | 'read') || 'all';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const serviceResponse = await notificationQueries.getNotifications(userId, filter, page, limit);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { notificationId } = req.params;

    const serviceResponse = await notificationCommands.markAsRead(userId, notificationId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;

    const serviceResponse = await notificationCommands.markAllAsRead(userId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
