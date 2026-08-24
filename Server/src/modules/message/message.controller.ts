import type { NextFunction, Request, Response } from '@/types/http';

import { messageCommands } from './commands/message.commands';
import { messageQueries } from './queries/message.queries';

export const startConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { recipientId } = req.body;

    const serviceResponse = await messageCommands.startConversation(userId, recipientId);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;

    const serviceResponse = await messageQueries.getConversations(userId);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 200);
    const before = typeof req.query.before === 'string' ? req.query.before : undefined;

    const serviceResponse = await messageQueries.getMessages(userId, conversationId, limit, before);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { conversationId } = req.params;
    const { content } = req.body;

    const serviceResponse = await messageCommands.sendMessage(userId, conversationId, content);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const reactToMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { messageId } = req.params;
    const { emoji } = req.body;

    const serviceResponse = await messageCommands.reactToMessage(userId, messageId, emoji);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};
