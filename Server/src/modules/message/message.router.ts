import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import * as controller from '@/modules/message/message.controller';
import { reactMessageSchema, sendMessageSchema, startConversationSchema } from '@/modules/message/message.dto';
import { createApiResponses, objectId } from '@/api-docs/openAPIResponseBuilders';
import { verifyAccessToken } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';

export const messageRegistry = new OpenAPIRegistry();

const PartnerSchema = z
  .object({
    _id: z.string(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    avatar: z.string().nullable().optional(),
  })
  .openapi('ConversationPartner');

const ConversationSchema = z
  .object({
    _id: z.string(),
    partner: PartnerSchema,
    lastMessage: z.object({ content: z.string(), sender: z.string(), createdAt: z.string().datetime() }).nullable(),
    unreadCount: z.number().int(),
    updatedAt: z.string().datetime().optional(),
  })
  .openapi('Conversation');

const ReactionSchema = z
  .object({
    emoji: z.string(),
    count: z.number().int(),
    reacted: z.boolean().openapi({ description: '`true` when the current user reacted with this emoji' }),
  })
  .openapi('MessageReaction');

const MessageSchema = z
  .object({
    _id: z.string(),
    content: z.string(),
    isMine: z.boolean(),
    reactions: z.array(ReactionSchema),
    isRead: z.boolean().optional(),
    createdAt: z.string().datetime().optional(),
  })
  .passthrough()
  .openapi('Message');

const conversationIdParam = z.object({ conversationId: objectId('Conversation id') });

const router = express.Router();

messageRegistry.registerPath({
  method: 'get',
  path: '/api/message/conversations',
  tags: ['Message'],
  summary: 'List my conversations',
  responses: createApiResponses(
    z.object({ conversations: z.array(ConversationSchema), totalUnread: z.number().int() }),
    'Conversations retrieved successfully',
    { auth: true }
  ),
});

router.get('/conversations', verifyAccessToken, controller.getConversations);

messageRegistry.registerPath({
  method: 'post',
  path: '/api/message/conversations',
  tags: ['Message'],
  summary: 'Start (or reuse) a conversation with a user',
  description: 'Returns the existing conversation when one already exists between the two users.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({ recipientId: objectId('The other participant') }).openapi('StartConversationBody'),
        },
      },
    },
  },
  responses: createApiResponses(z.object({ conversationId: z.string() }).passthrough(), 'Conversation ready', {
    auth: true,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
  }),
});

router.post(
  '/conversations',
  verifyAccessToken,
  validateRequest(startConversationSchema),
  controller.startConversation
);

messageRegistry.registerPath({
  method: 'get',
  path: '/api/message/conversations/{conversationId}',
  tags: ['Message'],
  summary: 'Get messages of a conversation',
  description:
    'Newest page first, ordered oldest → newest inside the page. Pass `before` (the oldest loaded message id) to page backwards. Opening the first page marks the conversation as read.',
  request: {
    params: conversationIdParam,
    query: z.object({
      limit: z.number().int().min(1).max(200).default(30).optional(),
      before: objectId('Cursor: oldest message id already loaded').optional(),
    }),
  },
  responses: createApiResponses(
    z.object({ partner: PartnerSchema, hasMore: z.boolean(), messages: z.array(MessageSchema) }),
    'Messages retrieved successfully',
    { auth: true, errors: [StatusCodes.NOT_FOUND] }
  ),
});

router.get('/conversations/:conversationId', verifyAccessToken, controller.getMessages);

messageRegistry.registerPath({
  method: 'post',
  path: '/api/message/conversations/{conversationId}',
  tags: ['Message'],
  summary: 'Send a message',
  description: 'The recipient also receives it in real time over Socket.IO.',
  request: {
    params: conversationIdParam,
    body: { content: { 'application/json': { schema: sendMessageSchema.shape.body.openapi('SendMessageBody') } } },
  },
  responses: createApiResponses(MessageSchema, 'Message sent', {
    status: StatusCodes.CREATED,
    auth: true,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
  }),
});

router.post(
  '/conversations/:conversationId',
  verifyAccessToken,
  validateRequest(sendMessageSchema),
  controller.sendMessage
);

messageRegistry.registerPath({
  method: 'post',
  path: '/api/message/messages/{messageId}/react',
  tags: ['Message'],
  summary: 'Toggle an emoji reaction on a message',
  request: {
    params: z.object({ messageId: objectId('Message id') }),
    body: { content: { 'application/json': { schema: reactMessageSchema.shape.body.openapi('ReactMessageBody') } } },
  },
  responses: createApiResponses(z.object({ reactions: z.array(ReactionSchema) }).passthrough(), 'Reaction updated', {
    auth: true,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
  }),
});

router.post(
  '/messages/:messageId/react',
  verifyAccessToken,
  validateRequest(reactMessageSchema),
  controller.reactToMessage
);

export const messageRouter = router;
