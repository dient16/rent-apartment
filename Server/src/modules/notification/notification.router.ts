import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import * as controller from '@/modules/notification/notification.controller';
import { createApiResponses, objectId } from '@/api-docs/openAPIResponseBuilders';
import { verifyAccessToken } from '@/middlewares/verifyToken';

export const notificationRegistry = new OpenAPIRegistry();

const NotificationSchema = z
  .object({
    _id: z.string(),
    user: z.string(),
    type: z.enum(['booking_created', 'booking_confirmed', 'booking_canceled', 'new_message']),
    title: z.string(),
    message: z.string(),
    link: z.string().optional().openapi({ description: 'Client route to open when clicked' }),
    isRead: z.boolean(),
    createdAt: z.string().datetime().optional(),
  })
  .openapi('Notification');

const router = express.Router();

notificationRegistry.registerPath({
  method: 'get',
  path: '/api/notification',
  tags: ['Notification'],
  summary: 'List my notifications',
  request: {
    query: z.object({
      filter: z.enum(['all', 'unread', 'read']).default('all').optional(),
      page: z.number().int().min(1).default(1).optional(),
      limit: z.number().int().min(1).max(50).default(10).optional(),
    }),
  },
  responses: createApiResponses(
    z.object({
      notifications: z.array(NotificationSchema),
      total: z.number().int(),
      unreadCount: z.number().int(),
      page: z.number().int(),
    }),
    'Notifications retrieved successfully',
    { auth: true }
  ),
});

router.get('/', verifyAccessToken, controller.getNotifications);

notificationRegistry.registerPath({
  method: 'post',
  path: '/api/notification/read-all',
  tags: ['Notification'],
  summary: 'Mark all my notifications as read',
  responses: createApiResponses(z.null(), 'All notifications marked as read', { auth: true }),
});

router.post('/read-all', verifyAccessToken, controller.markAllAsRead);

notificationRegistry.registerPath({
  method: 'post',
  path: '/api/notification/{notificationId}/read',
  tags: ['Notification'],
  summary: 'Mark one notification as read',
  request: { params: z.object({ notificationId: objectId('Notification id') }) },
  responses: createApiResponses(NotificationSchema, 'Notification marked as read', {
    auth: true,
    errors: [StatusCodes.NOT_FOUND],
  }),
});

router.post('/:notificationId/read', verifyAccessToken, controller.markAsRead);

export const notificationRouter = router;
