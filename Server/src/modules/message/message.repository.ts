import mongoose from 'mongoose';

import UserModel from '@/modules/user/user.model';

import { ConversationModel, MessageModel } from './message.model';

/** All Mongoose access for conversations/messages lives here. */
export const messageRepository = {
  userExists: (userId: string) => UserModel.findById(userId).select('_id').lean().exec(),

  findUserName: (userId: string) => UserModel.findById(userId).select('firstname lastname').lean(),

  findPairConversation: (userId: string, recipientId: string) =>
    ConversationModel.findOne({ participants: { $all: [userId, recipientId], $size: 2 } }).exec(),

  createConversation: (userId: string, recipientId: string) =>
    ConversationModel.create({ participants: [userId, recipientId] }),

  findUserConversations: (userId: string) =>
    ConversationModel.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate({ path: 'participants', select: 'firstname lastname avatar' })
      .lean()
      .exec(),

  /** Populated + lean — for read paths. */
  findConversationForUserLean: (conversationId: string, userId: string) =>
    ConversationModel.findOne({ _id: conversationId, participants: userId })
      .populate({ path: 'participants', select: 'firstname lastname avatar' })
      .lean()
      .exec(),

  /** Live document — for write paths that save() it. */
  findConversationDocForUser: (conversationId: string, userId: string) =>
    ConversationModel.findOne({ _id: conversationId, participants: userId }).exec(),

  isConversationMember: (conversationId: unknown, userId: string) =>
    ConversationModel.findOne({ _id: conversationId, participants: userId } as any)
      .select('_id')
      .lean()
      .exec(),

  countUnreadByConversation: (conversationIds: unknown[], userId: string) =>
    MessageModel.aggregate([
      {
        $match: {
          conversation: { $in: conversationIds },
          sender: { $ne: new mongoose.Types.ObjectId(userId) },
          isRead: false,
        },
      },
      { $group: { _id: '$conversation', count: { $sum: 1 } } },
    ]),

  findMessagePage: (filter: Record<string, unknown>, limit: number) =>
    MessageModel.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1) // the extra doc only tells us whether an older page exists
      .lean()
      .exec(),

  markConversationRead: (conversationId: string, userId: string) =>
    MessageModel.updateMany(
      { conversation: conversationId, sender: { $ne: userId }, isRead: false },
      { isRead: true }
    ).exec(),

  findMessageById: (messageId: string) => MessageModel.findById(messageId).lean().exec(),

  updateMessage: (messageId: string, update: Record<string, unknown>, options: Record<string, unknown> = {}) =>
    MessageModel.findByIdAndUpdate(messageId, update, { returnDocument: 'after', ...options })
      .lean()
      .exec(),

  createMessage: (conversationId: string, senderId: string, content: string) =>
    MessageModel.create({ conversation: conversationId, sender: senderId, content }),
};
