import express from 'express';

import * as controller from '@/api/message/message.controller';
import { reactMessageSchema, sendMessageSchema, startConversationSchema } from '@/api/message/message.dto';
import { verifyAccessToken } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';

const router = express.Router();

router.get('/conversations', verifyAccessToken, controller.getConversations);
router.post(
  '/conversations',
  verifyAccessToken,
  validateRequest(startConversationSchema),
  controller.startConversation
);
router.get('/conversations/:conversationId', verifyAccessToken, controller.getMessages);
router.post(
  '/conversations/:conversationId',
  verifyAccessToken,
  validateRequest(sendMessageSchema),
  controller.sendMessage
);

router.post(
  '/messages/:messageId/react',
  verifyAccessToken,
  validateRequest(reactMessageSchema),
  controller.reactToMessage
);

export const messageRouter = router;
