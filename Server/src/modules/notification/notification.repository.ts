import mongoose from 'mongoose';

import NotificationModel, { NotificationType } from './notification.model';

export interface NotificationInput {
  user: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/** All Mongoose access for notifications lives here. */
export const notificationRepository = {
  create: (data: NotificationInput) => NotificationModel.create(data),

  /** Upsert the single unread message-notification of a conversation (dedupe). */
  upsertUnreadMessageNotification: (
    recipientId: string | mongoose.Types.ObjectId,
    link: string,
    title: string,
    message: string
  ) =>
    NotificationModel.findOneAndUpdate(
      { user: recipientId, type: 'new_message', link, isRead: false },
      { $set: { title, message }, $setOnInsert: { user: recipientId, type: 'new_message', link } },
      { upsert: true, new: true, timestamps: true }
    ).exec(),

  markManyRead: (filter: Record<string, unknown>) => NotificationModel.updateMany(filter, { isRead: true }).exec(),

  markOneRead: (notificationId: string, userId: string) =>
    NotificationModel.findOneAndUpdate({ _id: notificationId, user: userId }, { isRead: true }, { new: true }).exec(),

  /** Page of notifications + total + unread count in one round trip. */
  findPage: (query: Record<string, unknown>, userId: string, page: number, limit: number) =>
    Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      NotificationModel.countDocuments(query).exec(),
      NotificationModel.countDocuments({ user: userId, isRead: false }).exec(),
    ]),
};
