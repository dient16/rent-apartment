import type { NextFunction, Request, Response } from 'express';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { messageService } from './message.service';

export const startConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { recipientId } = req.body;

    const serviceResponse = await messageService.startConversation(userId, recipientId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;

    const serviceResponse = await messageService.getConversations(userId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const serviceResponse = await messageService.getMessages(userId, conversationId, limit);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { conversationId } = req.params;
    const { content } = req.body;

    const serviceResponse = await messageService.sendMessage(userId, conversationId, content);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const reactToMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { messageId } = req.params;
    const { emoji } = req.body;

    const serviceResponse = await messageService.reactToMessage(userId, messageId, emoji);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
