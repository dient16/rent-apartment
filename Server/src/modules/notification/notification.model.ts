import type { Document } from 'mongoose';
import mongoose from 'mongoose';

export type NotificationType = 'booking_created' | 'booking_confirmed' | 'booking_canceled' | 'new_message';

export interface Notification {
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt?: Date;
}

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['booking_created', 'booking_confirmed', 'booking_canceled', 'new_message'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const NotificationModel = mongoose.model<Notification & Document>('Notification', notificationSchema, 'notifications');

export default NotificationModel;
