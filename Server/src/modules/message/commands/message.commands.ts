import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import { notificationCommands } from '@/modules/notification/commands/notification.commands';
import { emitToUser } from '@/socket';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { messageRepository } from '../message.repository';
import { groupReactions } from '../message.shared';

/** Write side: start conversations, send messages, react. */
export const messageCommands = {
  /** Find or create the conversation between 2 users (entry: "Message host" button) */
  async startConversation(userId: string, recipientId: string) {
    if (String(userId) === String(recipientId)) {
      return new ServiceResponse(ResponseStatus.Failed, 'You cannot message yourself', null, StatusCodes.BAD_REQUEST);
    }

    const [errRecipient, recipient] = await to(messageRepository.userExists(recipientId));
    if (errRecipient || !recipient) {
      return new ServiceResponse(ResponseStatus.Failed, 'Recipient not found', null, StatusCodes.NOT_FOUND);
    }

    const [errFind, existing] = await to(messageRepository.findPairConversation(userId, recipientId));
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
      : await to(messageRepository.createConversation(userId, recipientId));
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

  /** Toggle reaction: bấm lại cùng emoji -> bỏ; emoji khác -> thay thế */
  async reactToMessage(userId: string, messageId: string, emoji: string) {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return new ServiceResponse(ResponseStatus.Failed, 'Invalid message id', null, StatusCodes.BAD_REQUEST);
    }

    const [errMessage, message] = await to(messageRepository.findMessageById(messageId));
    if (errMessage || !message) {
      return new ServiceResponse(ResponseStatus.Failed, 'Message not found', null, StatusCodes.NOT_FOUND);
    }

    // Only conversation members may react
    const [errConversation, conversation] = await to(
      messageRepository.isConversationMember(message.conversation, userId)
    );
    if (errConversation || !conversation) {
      return new ServiceResponse(ResponseStatus.Failed, 'Message not found', null, StatusCodes.NOT_FOUND);
    }

    const existing = ((message as any).reactions || []).find(
      (reaction: any) => String(reaction.user) === String(userId)
    );

    const update =
      existing && existing.emoji === emoji
        ? { $pull: { reactions: { user: userId } } } // bấm lại cùng emoji -> bỏ react
        : existing
          ? { $set: { 'reactions.$[own].emoji': emoji } } // đổi sang emoji khác
          : { $push: { reactions: { user: userId, emoji } } }; // react mới

    const options: any =
      existing && existing.emoji !== emoji
        ? { arrayFilters: [{ 'own.user': new mongoose.Types.ObjectId(userId) }] }
        : {};

    const [errUpdate, updated] = await to(messageRepository.updateMessage(messageId, update, options));
    if (errUpdate) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error updating reaction',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
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
      messageRepository.findConversationDocForUser(conversationId, userId)
    );
    if (errConversation || !conversation) {
      return new ServiceResponse(ResponseStatus.Failed, 'Conversation not found', null, StatusCodes.NOT_FOUND);
    }

    const [err, message] = await to(messageRepository.createMessage(conversationId, userId, content));
    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error sending message',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    (conversation as any).lastMessage = {
      content,
      sender: new mongoose.Types.ObjectId(userId),
      createdAt: new Date(),
    } as any;
    await to((conversation as any).save());

    // Notify the recipient (fire-and-forget, never blocks sending)
    (async () => {
      const recipientId = ((conversation as any).participants as any[]).find(
        (participant) => String(participant) !== String(userId)
      );
      if (!recipientId) return;
      // Realtime push so the recipient's open chat updates instantly
      emitToUser(String(recipientId), 'message:new', { conversationId: String(conversationId) });
      const sender = await messageRepository.findUserName(userId);
      const senderName = [(sender as any)?.firstname, (sender as any)?.lastname].filter(Boolean).join(' ') || 'Someone';
      await notificationCommands.notifyNewMessage({
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
