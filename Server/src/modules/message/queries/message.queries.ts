import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import { notificationCommands } from '@/modules/notification/commands/notification.commands';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { messageRepository } from '../message.repository';
import { groupReactions, pickPartner } from '../message.shared';

/** Read side: conversation list and message pages. */
export const messageQueries = {
  /** My conversations with a per-conversation unread count */
  async getConversations(userId: string) {
    const [err, conversations] = await to(messageRepository.findUserConversations(userId));
    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error fetching conversations',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const [errCounts, unreadCounts] = await to(
      messageRepository.countUnreadByConversation(
        conversations.map((conversation) => conversation._id),
        userId
      )
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

  /**
   * Messages of one conversation, newest page first (cursor = oldest loaded _id).
   * Opening the thread (no cursor) also marks incoming ones as read.
   */
  async getMessages(userId: string, conversationId: string, limit: number, before?: string) {
    const [errConversation, conversation] = await to(
      messageRepository.findConversationForUserLean(conversationId, userId)
    );
    if (errConversation || !conversation) {
      return new ServiceResponse(ResponseStatus.Failed, 'Conversation not found', null, StatusCodes.NOT_FOUND);
    }

    const messageFilter: Record<string, unknown> = { conversation: conversationId };
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      messageFilter._id = { $lt: new mongoose.Types.ObjectId(before) };
    }
    const [err, messages] = await to(messageRepository.findMessagePage(messageFilter, limit));
    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error fetching messages',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    const hasMore = messages.length > limit;
    const pageMessages = hasMore ? messages.slice(0, limit) : messages;

    // Opening the thread (first page only) marks partner messages and notifications read
    if (!before) {
      await to(messageRepository.markConversationRead(conversationId, userId));
      notificationCommands.markMessageNotificationsRead(userId, conversationId).catch(() => {});
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Messages retrieved successfully',
      {
        partner: pickPartner(conversation, userId),
        hasMore,
        messages: pageMessages.reverse().map((message) => ({
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
};
