import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import { emitToUser } from '@/socket';
import { logger } from '@/utils/logger';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { decryptText, encryptBuffer, encryptText } from '../chat.crypto';
import type { ChatLastMessage, ChatMember, ChatMessage, ChatRoom } from '../chat.model';
import { chatRepository } from '../chat.repository';
import { canManage, directKeyFor, memberOf, referencedUserIds, STICKER_ID, toPublicMessage, toPublicUser } from '../chat.shared';
import { chatQueries } from '../queries/chat.queries';

type RoomDoc = ChatRoom & { _id: unknown };

const failed = (message: string, status: number) => new ServiceResponse(ResponseStatus.Failed, message, null, status);
const serverError = (message: string) => failed(message, StatusCodes.INTERNAL_SERVER_ERROR);
const ok = <T>(message: string, data: T, status = StatusCodes.OK) => new ServiceResponse(ResponseStatus.Success, message, data, status);

const member = (userId: string, role: ChatMember['role'] = 'member'): ChatMember => ({
  user: new mongoose.Types.ObjectId(userId),
  role,
  joinedAt: new Date(),
  lastReadAt: new Date(0),
});

const notifyMembers = (room: ChatRoom, event: string, payload: Record<string, unknown>, except?: string) => {
  for (const m of room.members) {
    const id = String(m.user);
    if (id !== except) emitToUser(id, event, payload);
  }
};

const lastMessageOf = (message: ChatMessage): ChatLastMessage => ({
  type: message.type,
  content: message.content,
  sender: message.sender,
  createdAt: message.createdAt,
  recalled: message.recalled,
});

const nameOf = async (userId: string) => toPublicUser((await chatRepository.findUsersByIds([userId]))[0]).name;

/** The quoted message, when it exists in this room. */
const quotedIn = async (roomId: string, replyTo?: string) => {
  if (!replyTo) return null;
  const quoted = await chatRepository.findMessageById(replyTo);
  return quoted && String(quoted.room) === roomId ? (quoted.toObject() as ChatMessage & { _id: unknown }) : null;
};

/** Persist a message, bump the room and push it to every member (sender gets it in the response). */
const deliver = async (
  room: RoomDoc,
  userId: string | null,
  data: { type: ChatMessage['type']; content: string; image?: ChatMessage['image']; replyTo?: string }
) => {
  const roomId = String(room._id);
  const quoted = await quotedIn(roomId, data.replyTo);
  const message = await chatRepository.createMessage({
    room: room._id as mongoose.Types.ObjectId,
    sender: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    type: data.type,
    content: encryptText(data.content),
    image: data.image,
    replyTo: quoted ? (quoted._id as mongoose.Types.ObjectId) : undefined,
  });
  // Room bump + read mark are not needed for the reply: let them finish in the background.
  Promise.all([chatRepository.setLastMessage(roomId, lastMessageOf(message)), userId ? chatRepository.markRead(roomId, userId) : null]).catch(
    (error) => logger.warn({ err: error, roomId }, 'chat: room bump after send failed')
  );
  const ids = [userId, quoted?.sender ? String(quoted.sender) : null].filter((id): id is string => !!id);
  const userDocs = ids.length ? await chatRepository.findUsersByIds(ids) : [];
  const users = new Map(userDocs.map((u) => [String(u._id), toPublicUser(u)]));
  const payload = toPublicMessage(message.toObject(), users, '', quoted);
  notifyMembers(room, 'chat:message', { roomId, message: payload }, userId ?? undefined);
  return { ...payload, isMine: true };
};

const system = (room: RoomDoc, text: string) => deliver(room, null, { type: 'system', content: text });

export const chatCommands = {
  /** Find or create the 1:1 room with another user. */
  async createDirect(userId: string, otherId: string) {
    if (userId === otherId) return failed('You cannot chat with yourself', StatusCodes.BAD_REQUEST);
    const [errUsers, users] = await to(chatRepository.findUsersByIds([otherId]));
    if (errUsers) return serverError('Error looking up user');
    if (!users?.length) return failed('User not found', StatusCodes.NOT_FOUND);

    const directKey = directKeyFor(userId, otherId);
    const [errFind, existing] = await to(chatRepository.findDirectRoom(directKey));
    if (errFind) return serverError('Error opening chat');
    const room =
      existing ??
      (await chatRepository.createRoom({ type: 'direct', members: [member(userId), member(otherId)], createdBy: userId, directKey }));
    if (!existing) emitToUser(otherId, 'chat:room', { roomId: String(room._id) });
    return chatQueries.getRoom(String(room._id), userId);
  },

  async createGroup(userId: string, name: string, memberIds: string[]) {
    const others = [...new Set(memberIds.filter((id) => id !== userId))];
    if (!others.length) return failed('Add at least one other member', StatusCodes.BAD_REQUEST);
    const [errUsers, users] = await to(chatRepository.findUsersByIds(others));
    if (errUsers) return serverError('Error looking up members');
    if (users.length !== others.length) return failed('Some members were not found', StatusCodes.NOT_FOUND);

    const [errCreate, room] = await to(
      chatRepository.createRoom({ type: 'group', name, members: [member(userId, 'owner'), ...others.map((id) => member(id))], createdBy: userId })
    );
    if (errCreate || !room) return serverError('Error creating group');
    await system(room, `${await nameOf(userId)} created the group "${name}"`);
    notifyMembers(room, 'chat:room', { roomId: String(room._id) });
    return chatQueries.getRoom(String(room._id), userId);
  },

  async renameGroup(userId: string, roomId: string, name: string) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    if (room.type !== 'group') return failed('Only groups can be renamed', StatusCodes.BAD_REQUEST);
    if (!canManage(room, userId)) return failed('Only the owner or an admin can rename the group', StatusCodes.FORBIDDEN);
    room.name = name;
    await room.save();
    await system(room, `${await nameOf(userId)} renamed the group to "${name}"`);
    notifyMembers(room, 'chat:room', { roomId });
    return chatQueries.getRoom(roomId, userId);
  },

  async addMembers(userId: string, roomId: string, memberIds: string[]) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    if (room.type !== 'group') return failed('Members can only be added to groups', StatusCodes.BAD_REQUEST);
    if (!canManage(room, userId)) return failed('Only the owner or an admin can add members', StatusCodes.FORBIDDEN);

    const fresh = [...new Set(memberIds)].filter((id) => !memberOf(room, id));
    if (!fresh.length) return failed('Everyone is already in the group', StatusCodes.BAD_REQUEST);
    const users = await chatRepository.findUsersByIds(fresh);
    if (users.length !== fresh.length) return failed('Some members were not found', StatusCodes.NOT_FOUND);

    room.members.push(...fresh.map((id) => member(id)));
    await room.save();
    await system(room, `${await nameOf(userId)} added ${users.map((u) => toPublicUser(u).name).join(', ')}`);
    notifyMembers(room, 'chat:room', { roomId });
    return chatQueries.getRoom(roomId, userId);
  },

  /** Owner only: promote to admin or demote to member. */
  async setMemberRole(userId: string, roomId: string, targetId: string, role: 'admin' | 'member') {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    if (room.type !== 'group') return failed('Roles only exist in groups', StatusCodes.BAD_REQUEST);
    if (memberOf(room, userId)?.role !== 'owner') return failed('Only the owner can change roles', StatusCodes.FORBIDDEN);
    const target = memberOf(room, targetId);
    if (!target) return failed('That user is not in the group', StatusCodes.NOT_FOUND);
    if (target.role === 'owner') return failed('The owner role cannot be changed', StatusCodes.BAD_REQUEST);
    if (target.role === role) return chatQueries.getRoom(roomId, userId);
    target.role = role;
    room.markModified('members');
    await room.save();
    await system(room, `${await nameOf(userId)} made ${await nameOf(targetId)} ${role === 'admin' ? 'an admin' : 'a member'}`);
    notifyMembers(room, 'chat:room', { roomId });
    return chatQueries.getRoom(roomId, userId);
  },

  /** Remove someone (owner/admin) or leave yourself. The owner cannot leave while others remain. */
  async removeMember(userId: string, roomId: string, targetId: string) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    if (room.type !== 'group') return failed('You cannot leave a direct chat', StatusCodes.BAD_REQUEST);
    const target = memberOf(room, targetId);
    if (!target) return failed('That user is not in the group', StatusCodes.NOT_FOUND);
    const isSelf = userId === targetId;
    if (!isSelf && !canManage(room, userId)) return failed('Only the owner or an admin can remove members', StatusCodes.FORBIDDEN);
    if (target.role === 'owner' && room.members.length > 1) {
      return failed('The owner cannot leave while the group has other members', StatusCodes.BAD_REQUEST);
    }

    const before = room.toObject() as RoomDoc;
    room.members = room.members.filter((m) => String(m.user) !== targetId) as typeof room.members;
    await room.save();
    const actor = await nameOf(userId);
    await system(before, isSelf ? `${actor} left the group` : `${actor} removed ${await nameOf(targetId)}`);
    notifyMembers(before, 'chat:room', { roomId });
    return ok(isSelf ? 'You left the group' : 'Member removed', null);
  },

  async sendText(userId: string, roomId: string, content: string, replyTo?: string) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    const [err, message] = await to(deliver(room, userId, { type: 'text', content, replyTo }));
    if (err || !message) return serverError('Error sending message');
    return ok('Message sent', message, StatusCodes.CREATED);
  },

  async sendSticker(userId: string, roomId: string, sticker: string, replyTo?: string) {
    if (!STICKER_ID.test(sticker)) return failed('Unknown sticker', StatusCodes.BAD_REQUEST);
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    const [err, message] = await to(deliver(room, userId, { type: 'sticker', content: sticker, replyTo }));
    if (err || !message) return serverError('Error sending sticker');
    return ok('Sticker sent', message, StatusCodes.CREATED);
  },

  /** Image bytes are encrypted before they reach GridFS; the message stores the file id. */
  async sendImage(userId: string, roomId: string, file: { buffer: Buffer; mimetype: string; size: number }, replyTo?: string) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    const encrypted = encryptBuffer(file.buffer);
    const [errStore, fileId] = await to(
      chatRepository.storeImage(encrypted.data, { contentType: file.mimetype, iv: encrypted.iv, tag: encrypted.tag, room: roomId, sender: userId })
    );
    if (errStore || !fileId) return serverError('Error storing image');
    const [err, message] = await to(
      deliver(room, userId, { type: 'image', content: fileId, image: { contentType: file.mimetype, size: file.size }, replyTo })
    );
    if (err || !message) return serverError('Error sending image');
    return ok('Image sent', message, StatusCodes.CREATED);
  },

  /** Toggle an emoji reaction (members only). Everyone in the room gets the updated message. */
  async reactMessage(userId: string, messageId: string, emoji: string) {
    const message = await chatRepository.findMessageById(messageId);
    if (!message) return failed('Message not found', StatusCodes.NOT_FOUND);
    if (message.recalled || message.type === 'system') return failed('This message cannot be reacted to', StatusCodes.BAD_REQUEST);
    const roomId = String(message.room);
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);

    const mine = message.reactions.findIndex((r) => String(r.user) === userId && r.emoji === emoji);
    if (mine >= 0) message.reactions.splice(mine, 1);
    else message.reactions.push({ user: new mongoose.Types.ObjectId(userId), emoji });
    message.markModified('reactions');

    const ids = referencedUserIds([message.toObject() as never]);
    const [, userDocs, quoted] = await Promise.all([
      message.save(),
      chatRepository.findUsersByIds(ids),
      message.replyTo ? quotedIn(roomId, String(message.replyTo)) : Promise.resolve(null),
    ]);
    const users = new Map(userDocs.map((u) => [String(u._id), toPublicUser(u)]));
    const plain = message.toObject() as ChatMessage & { _id: unknown };
    for (const m of room.members) {
      emitToUser(String(m.user), 'chat:message', { roomId, message: toPublicMessage(plain, users, String(m.user), quoted), reaction: true });
    }
    return ok('Reaction updated', toPublicMessage(plain, users, userId, quoted));
  },

  /** Sender-only recall: the content is dropped for everyone (and the image file deleted). */
  async recallMessage(userId: string, messageId: string) {
    const message = await chatRepository.findMessageById(messageId);
    if (!message) return failed('Message not found', StatusCodes.NOT_FOUND);
    if (String(message.sender) !== userId) return failed('You can only recall your own messages', StatusCodes.FORBIDDEN);
    if (message.recalled) return ok('Message already recalled', null);
    const roomId = String(message.room);
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);

    if (message.type === 'image') {
      const fileId = decryptText(message.content);
      if (fileId) await to(chatRepository.deleteImage(fileId));
    }
    message.recalled = true;
    // the original text is gone for good; an empty ciphertext would fail the schema
    message.content = encryptText('[recalled]');
    message.image = undefined;
    await message.save();

    const latest = await chatRepository.findLatestMessage(roomId);
    if (latest && String(latest._id) === messageId) await chatRepository.setLastMessage(roomId, lastMessageOf(message));

    const payload = toPublicMessage(message.toObject(), new Map(), '');
    notifyMembers(room, 'chat:message', { roomId, message: payload, recalled: true });
    return ok('Message recalled', { ...payload, isMine: true });
  },

  async markRead(userId: string, roomId: string) {
    const [err] = await to(chatRepository.markRead(roomId, userId));
    if (err) return serverError('Error updating read state');
    return ok('Marked as read', null);
  },
};
