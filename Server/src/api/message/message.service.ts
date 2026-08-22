import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import { notificationService } from '@/api/notification/notification.service';
import UserModel from '@/api/user/user.model';
import { env } from '@/config/env.config';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { ConversationModel, MessageModel } from './message.model';

const { SERVER_URL } = env;

const toAvatarUrl = (avatar?: string) =>
  avatar && !avatar.startsWith('http') ? `${SERVER_URL}/api/image/${avatar}` : avatar;

/** The other participant of a 2-person conversation */
/** Group raw reactions into [{emoji, count, mine}] */
const groupReactions = (reactions: any[] = [], userId: string) => {
  const grouped: Record<string, { emoji: string; count: number; mine: boolean }> = {};
  for (const reaction of reactions) {
    if (!grouped[reaction.emoji]) {
      grouped[reaction.emoji] = { emoji: reaction.emoji, count: 0, mine: false };
    }
    grouped[reaction.emoji].count += 1;
    if (String(reaction.user) === String(userId)) grouped[reaction.emoji].mine = true;
  }
  return Object.values(grouped);
};

const pickPartner = (conversation: any, userId: string) => {
  const partner = (conversation.participants as any[]).find(
    (participant) => String(participant._id ?? participant) !== String(userId)
  );
  if (!partner || !partner._id) return null;
  return {
    _id: partner._id,
    firstname: partner.firstname,
    lastname: partner.lastname,
    avatar: toAvatarUrl(partner.avatar),
  };
};

export const messageService = {
  /** Find or create the conversation between 2 users (entry: "Message host" button) */
  async startConversation(userId: string, recipientId: string) {
    if (String(userId) === String(recipientId)) {
      return new ServiceResponse(ResponseStatus.Failed, 'You cannot message yourself', null, StatusCodes.BAD_REQUEST);
    }

    const [errRecipient, recipient] = await to(UserModel.findById(recipientId).select('_id').lean().exec());
    if (errRecipient || !recipient) {
      return new ServiceResponse(ResponseStatus.Failed, 'Recipient not found', null, StatusCodes.NOT_FOUND);
    }

    const [errFind, existing] = await to(
      ConversationModel.findOne({ participants: { $all: [userId, recipientId], $size: 2 } }).exec()
    );
    if (errFind) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error starting conversation',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const [err, conversation] = existing
      ? [null, existing]
      : await to(ConversationModel.create({ participants: [userId, recipientId] }));
    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error starting conversation',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse(ResponseStatus.Success, 'Conversation ready', conversation, StatusCodes.OK);
  },

  /** My conversations with a per-conversation unread count */
  async getConversations(userId: string) {
    const [err, conversations] = await to(
      ConversationModel.find({ participants: userId })
        .sort({ updatedAt: -1 })
        .populate({ path: 'participants', select: 'firstname lastname avatar' })
        .lean()
        .exec()
    );
    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error fetching conversations',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const [errCounts, unreadCounts] = await to(
      MessageModel.aggregate([
        {
          $match: {
            conversation: { $in: conversations.map((conversation) => conversation._id) },
            sender: { $ne: new mongoose.Types.ObjectId(userId) },
            isRead: false,
          },
        },
        { $group: { _id: '$conversation', count: { $sum: 1 } } },
      ])
    );
    if (errCounts) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error counting unread messages',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const unreadMap: Record<string, number> = {};
    unreadCounts.forEach((row: any) => {
      unreadMap[String(row._id)] = row.count;
    });

    const result = conversations
      .map((conversation) => ({
        _id: conversation._id,
        partner: pickPartner(conversation, userId),
        lastMessage: conversation.lastMessage?.content
          ? {
              content: conversation.lastMessage.content,
              isMine: String(conversation.lastMessage.sender) === String(userId),
              createdAt: conversation.lastMessage.createdAt,
            }
          : null,
        unreadCount: unreadMap[String(conversation._id)] || 0,
        updatedAt: (conversation as any).updatedAt,
      }))
      .filter((conversation) => conversation.partner);

    const totalUnread = result.reduce((sum, conversation) => sum + conversation.unreadCount, 0);

    return new ServiceResponse(
      ResponseStatus.Success,
      'Conversations retrieved successfully',
      { conversations: result, totalUnread },
      StatusCodes.OK
    );
  },

  /** Messages of one conversation; also marks incoming ones as read */
  async getMessages(userId: string, conversationId: string, limit: number) {
    const [errConversation, conversation] = await to(
      ConversationModel.findOne({ _id: conversationId, participants: userId })
        .populate({ path: 'participants', select: 'firstname lastname avatar' })
        .lean()
        .exec()
    );
    if (errConversation || !conversation) {
      return new ServiceResponse(ResponseStatus.Failed, 'Conversation not found', null, StatusCodes.NOT_FOUND);
    }

    const [err, messages] = await to(
      MessageModel.find({ conversation: conversationId }).sort({ createdAt: -1 }).limit(limit).lean().exec()
    );
    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error fetching messages',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Opening the thread marks partner messages and this conversation's message notification read
    await to(
      MessageModel.updateMany(
        { conversation: conversationId, sender: { $ne: userId }, isRead: false },
        { isRead: true }
      ).exec()
    );
    notificationService.markMessageNotificationsRead(userId, conversationId).catch(() => {});

    return new ServiceResponse(
      ResponseStatus.Success,
      'Messages retrieved successfully',
      {
        partner: pickPartner(conversation, userId),
        messages: messages.reverse().map((message) => ({
          _id: message._id,
          content: message.content,
          isMine: String(message.sender) === String(userId),
          reactions: groupReactions((message as any).reactions, userId),
          createdAt: (message as any).createdAt,
        })),
      },
      StatusCodes.OK
    );
  },

  /** Toggle reaction: bam lai cung emoji -> bo; emoji khac -> thay the */
  async reactToMessage(userId: string, messageId: string, emoji: string) {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return new ServiceResponse(ResponseStatus.Failed, 'Invalid message id', null, StatusCodes.BAD_REQUEST);
    }

    const [errMessage, message] = await to(MessageModel.findById(messageId).lean().exec());
    if (errMessage || !message) {
      return new ServiceResponse(ResponseStatus.Failed, 'Message not found', null, StatusCodes.NOT_FOUND);
    }

    // Only conversation members may react
    const [errConversation, conversation] = await to(
      ConversationModel.findOne({ _id: message.conversation, participants: userId }).select('_id').lean().exec()
    );
    if (errConversation || !conversation) {
      return new ServiceResponse(ResponseStatus.Failed, 'Message not found', null, StatusCodes.NOT_FOUND);
    }

    const existing = ((message as any).reactions || []).find(
      (reaction: any) => String(reaction.user) === String(userId)
    );

    const update =
      existing && existing.emoji === emoji
        ? { $pull: { reactions: { user: userId } } } // bam lai cung emoji -> bo react
        : existing
          ? { $set: { 'reactions.$[own].emoji': emoji } } // doi sang emoji khac
          : { $push: { reactions: { user: userId, emoji } } }; // react moi

    const options: any =
      existing && existing.emoji !== emoji ? { arrayFilters: [{ 'own.user': new mongoose.Types.ObjectId(userId) }] } : {};

    const [errUpdate, updated] = await to(
      MessageModel.findByIdAndUpdate(messageId, update, { new: true, ...options }).lean().exec()
    );
    if (errUpdate) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error updating reaction', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Reaction updated',
      { _id: messageId, reactions: groupReactions((updated as any)?.reactions, userId) },
      StatusCodes.OK
    );
  },

  async sendMessage(userId: string, conversationId: string, content: string) {
    const [errConversation, conversation] = await to(
      ConversationModel.findOne({ _id: conversationId, participants: userId }).exec()
    );
    if (errConversation || !conversation) {
      return new ServiceResponse(ResponseStatus.Failed, 'Conversation not found', null, StatusCodes.NOT_FOUND);
    }

    const [err, message] = await to(MessageModel.create({ conversation: conversationId, sender: userId, content }));
    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error sending message',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    conversation.lastMessage = {
      content,
      sender: new mongoose.Types.ObjectId(userId),
      createdAt: new Date(),
    } as any;
    await to(conversation.save());

    // Notify the recipient (fire-and-forget, never blocks sending)
    (async () => {
      const recipientId = (conversation.participants as any[]).find(
        (participant) => String(participant) !== String(userId)
      );
      if (!recipientId) return;
      const sender = await UserModel.findById(userId).select('firstname lastname').lean();
      const senderName =
        [(sender as any)?.firstname, (sender as any)?.lastname].filter(Boolean).join(' ') || 'Someone';
      await notificationService.notifyNewMessage({
        recipientId,
        senderName,
        conversationId: String(conversationId),
        preview: content,
      });
    })().catch(() => {});

    return new ServiceResponse(
      ResponseStatus.Success,
      'Message sent',
      {
        _id: message._id,
        content: message.content,
        isMine: true,
        createdAt: (message as any).createdAt,
      },
      StatusCodes.CREATED
    );
  },
};
