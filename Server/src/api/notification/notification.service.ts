import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import { logger } from '@/utils/logger';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import NotificationModel, { NotificationType } from './notification.model';

interface CreateNotificationInput {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export const notificationService = {
  /** Internal helper other services call to emit a notification. Never throws. */
  async notify({ userId, type, title, message, link }: CreateNotificationInput): Promise<void> {
    const [err] = await to(NotificationModel.create({ user: userId, type, title, message, link }));
    if (err) {
      logger.error(`Failed to create notification for user ${userId}: ${err.message}`);
    }
  },

  /**
   * New-message notification — dedupe: keep only 1 UNREAD notification per conversation;
   * new messages update it and bump it to the top instead of spamming rows.
   */
  async notifyNewMessage(input: {
    recipientId: string | mongoose.Types.ObjectId;
    senderName: string;
    conversationId: string;
    preview: string;
  }): Promise<void> {
    const link = `/messages?c=${input.conversationId}`;
    const title = 'New message';
    const message = `${input.senderName}: ${input.preview.slice(0, 120)}`;
    const [err] = await to(
      NotificationModel.findOneAndUpdate(
        { user: input.recipientId, type: 'new_message', link, isRead: false },
        { $set: { title, message }, $setOnInsert: { user: input.recipientId, type: 'new_message', link } },
        { upsert: true, new: true, timestamps: true }
      ).exec()
    );
    if (err) {
      logger.error(`Failed to notify new message: ${err.message}`);
    }
  },

  /** Reading a conversation marks that conversation's message notification as read */
  async markMessageNotificationsRead(userId: string, conversationId: string): Promise<void> {
    await to(
      NotificationModel.updateMany(
        { user: userId, type: 'new_message', link: `/messages?c=${conversationId}`, isRead: false },
        { isRead: true }
      ).exec()
    );
  },

  async getNotifications(userId: string, filter: 'all' | 'unread' | 'read', page: number, limit: number) {
    const query: Record<string, unknown> = { user: userId };
    if (filter === 'unread') query.isRead = false;
    if (filter === 'read') query.isRead = true;

    const [err, result] = await to(
      Promise.all([
        NotificationModel.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec(),
        NotificationModel.countDocuments(query).exec(),
        NotificationModel.countDocuments({ user: userId, isRead: false }).exec(),
      ])
    );

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error fetching notifications',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const [notifications, total, unreadCount] = result;
    return new ServiceResponse(
      ResponseStatus.Success,
      'Notifications retrieved successfully',
      { notifications, total, unreadCount, page },
      StatusCodes.OK
    );
  },

  async markAsRead(userId: string, notificationId: string) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return new ServiceResponse(ResponseStatus.Failed, 'Invalid notification id', null, StatusCodes.BAD_REQUEST);
    }
    const [err, notification] = await to(
      NotificationModel.findOneAndUpdate({ _id: notificationId, user: userId }, { isRead: true }, { new: true }).exec()
    );
    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error updating notification', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
    if (!notification) {
      return new ServiceResponse(ResponseStatus.Failed, 'Notification not found', null, StatusCodes.NOT_FOUND);
    }
    return new ServiceResponse(ResponseStatus.Success, 'Notification marked as read', notification, StatusCodes.OK);
  },

  async markAllAsRead(userId: string) {
    const [err] = await to(NotificationModel.updateMany({ user: userId, isRead: false }, { isRead: true }).exec());
    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error updating notifications', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
    return new ServiceResponse(ResponseStatus.Success, 'All notifications marked as read', null, StatusCodes.OK);
  },
};
