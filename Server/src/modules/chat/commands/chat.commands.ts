import crypto from 'node:crypto';

import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import { emitToUser } from '@/socket';
import { logger } from '@/utils/logger';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { decryptText, encryptBuffer, encryptText } from '../chat.crypto';
import type { ChatLastMessage, ChatMember, ChatMessage, ChatRoom, ClientCipher } from '../chat.model';
import { chatRepository } from '../chat.repository';
import { canManage, directKeyFor, memberOf, referencedUserIds, toPublicMessage, toPublicUser } from '../chat.shared';
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
  cipher: message.cipher,
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
  data: {
    type: ChatMessage['type'];
    content: string;
    image?: ChatMessage['image'];
    replyTo?: string;
    album?: string;
    cipher?: ClientCipher;
    mentions?: string[];
  }
) => {
  const roomId = String(room._id);
  const quoted = await quotedIn(roomId, data.replyTo);
  const message = await chatRepository.createMessage({
    room: room._id as mongoose.Types.ObjectId,
    sender: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    type: data.type,
    content: encryptText(data.content),
    cipher: data.cipher,
    mentions: data.mentions?.length ? data.mentions.map((id) => new mongoose.Types.ObjectId(id)) : undefined,
    image: data.image,
    album: data.album,
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

  /** Owner only: promote to admin, demote to member, or hand the group over. */
  async setMemberRole(userId: string, roomId: string, targetId: string, role: 'owner' | 'admin' | 'member') {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    if (room.type !== 'group') return failed('Roles only exist in groups', StatusCodes.BAD_REQUEST);
    const me = memberOf(room, userId);
    if (me?.role !== 'owner') return failed('Only the owner can change roles', StatusCodes.FORBIDDEN);
    const target = memberOf(room, targetId);
    if (!target) return failed('That user is not in the group', StatusCodes.NOT_FOUND);
    if (userId === targetId) return failed('You already own this group', StatusCodes.BAD_REQUEST);
    if (target.role === role) return chatQueries.getRoom(roomId, userId);

    const handover = role === 'owner';
    target.role = role;
    // a group has exactly one owner: handing it over makes the previous owner an admin
    if (handover) me.role = 'admin';
    room.markModified('members');
    await room.save();
    const actor = await nameOf(userId);
    const targetName = await nameOf(targetId);
    await system(room, handover ? `${actor} made ${targetName} the group owner` : `${actor} made ${targetName} ${role === 'admin' ? 'an admin' : 'a member'}`);
    notifyMembers(room, 'chat:room', { roomId });
    return chatQueries.getRoom(roomId, userId);
  },

  /** Group photo: owner / admin only. Stored like any chat image and served through a signed URL. */
  async setGroupAvatar(userId: string, roomId: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    if (room.type !== 'group') return failed('Only groups have a photo', StatusCodes.BAD_REQUEST);
    if (!canManage(room, userId)) return failed('Only the owner or an admin can change the photo', StatusCodes.FORBIDDEN);

    const enc = encryptBuffer(file.buffer);
    const [errStore, fileId] = await to(
      chatRepository.storeImage(enc.data, { contentType: file.mimetype, iv: enc.iv, tag: enc.tag, room: roomId, sender: userId })
    );
    if (errStore || !fileId) return serverError('Error storing the photo');
    const [errSet] = await to(chatRepository.setRoomAvatar(roomId, fileId));
    if (errSet) return serverError('Error saving the photo');
    await system(room, `${await nameOf(userId)} updated the group photo`);
    notifyMembers(room, 'chat:room', { roomId });
    return chatQueries.getRoom(roomId, userId);
  },

  /** Pin a message to the top of the room (owner / admin in groups, anyone in a direct chat). */
  async pinMessage(userId: string, roomId: string, messageId: string | null) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    if (room.type === 'group' && !canManage(room, userId)) {
      return failed('Only the owner or an admin can pin messages', StatusCodes.FORBIDDEN);
    }
    if (messageId) {
      const message = await chatRepository.findMessageById(messageId);
      if (!message || String(message.room) !== roomId) return failed('Message not found', StatusCodes.NOT_FOUND);
      if (message.recalled) return failed('This message was recalled', StatusCodes.BAD_REQUEST);
    }
    const [err] = await to(chatRepository.setPinnedMessage(roomId, messageId));
    if (err) return serverError('Error pinning the message');
    await system(room, `${await nameOf(userId)} ${messageId ? 'pinned a message' : 'unpinned the message'}`);
    notifyMembers(room, 'chat:room', { roomId });
    return chatQueries.getRoom(roomId, userId);
  },

  /** Mute / unmute the room for yourself. */
  async setMuted(userId: string, roomId: string, muted: boolean) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    const [err] = await to(chatRepository.setMuted(roomId, userId, muted));
    if (err) return serverError('Error updating notifications');
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

  /**
   * The room's encryption key, created on first use. Any member may read it: it exists so API
   * requests carry ciphertext instead of plain text, not to hide messages from the server -
   * that way every device of every member can always read the history.
   */
  async ensureRoomKey(userId: string, roomId: string) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    if (room.crypto?.keyId) return ok('Room key', { keyId: room.crypto.keyId, key: decryptText(room.crypto.key) });

    const keyId = `k-${crypto.randomBytes(8).toString('hex')}`;
    const key = crypto.randomBytes(32).toString('base64');
    const [err, claimed] = await to(chatRepository.claimRoomKey(roomId, keyId, encryptText(key)));
    if (err) return serverError('Error creating the room key');
    if (claimed?.crypto) return ok('Room key', { keyId: claimed.crypto.keyId, key });
    // another member created it first - use theirs
    const fresh = await chatRepository.findRoomForMember(roomId, userId);
    if (!fresh?.crypto) return serverError('Error creating the room key');
    return ok('Room key', { keyId: fresh.crypto.keyId, key: decryptText(fresh.crypto.key) });
  },

  /** Message whose body was encrypted in the browser with the room key. */
  async sendEncrypted(
    userId: string,
    roomId: string,
    type: 'text' | 'sticker',
    cipher: { keyId: string; iv: string; data: string },
    replyTo?: string,
    mentions?: string[]
  ) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    if (room.crypto?.keyId !== cipher.keyId) return failed('Room key changed - reload the chat', StatusCodes.CONFLICT);
    const [err, message] = await to(
      deliver(room, userId, {
        type,
        // the real body lives in `cipher`; this placeholder keeps the schema's required field happy
        content: 'encrypted',
        replyTo,
        cipher: { keyId: cipher.keyId, iv: Buffer.from(cipher.iv, 'base64'), data: Buffer.from(cipher.data, 'base64') },
        // the body is ciphertext, so the ids of the @-mentioned members travel beside it
        mentions: mentions?.filter((id) => room.members.some((m) => String(m.user) === id)),
      })
    );
    if (err || !message) return serverError('Error sending message');
    return ok('Message sent', message, StatusCodes.CREATED);
  },

  async sendImage(
    userId: string,
    roomId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
    replyTo?: string,
    album?: string,
    e2e?: { keyId: string; iv: string; contentType: string }
  ) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    if (e2e && room.crypto?.keyId !== e2e.keyId) return failed('Room key changed - reload the chat', StatusCodes.CONFLICT);
    // e2e: the browser already encrypted the bytes with the room key - store them as they are
    const stored = e2e ? { data: file.buffer, meta: { e2e: true } } : (() => {
      const enc = encryptBuffer(file.buffer);
      return { data: enc.data, meta: { iv: enc.iv, tag: enc.tag } };
    })();
    const [errStore, fileId] = await to(
      chatRepository.storeImage(stored.data, { contentType: e2e?.contentType ?? file.mimetype, ...stored.meta, room: roomId, sender: userId })
    );
    if (errStore || !fileId) return serverError('Error storing image');
    const [err, message] = await to(
      deliver(room, userId, {
        type: 'image',
        content: fileId,
        image: e2e
          ? { contentType: e2e.contentType, size: file.size, e2e: true, iv: Buffer.from(e2e.iv, 'base64') }
          : { contentType: file.mimetype, size: file.size },
        replyTo,
        album,
        cipher: e2e ? { keyId: e2e.keyId, iv: Buffer.from(e2e.iv, 'base64'), data: Buffer.from('img') } : undefined,
      })
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

  /** Sender-only edit of a text message; everyone gets the new body over the socket. */
  async editMessage(userId: string, messageId: string, body: { content?: string; cipher?: { keyId: string; iv: string; data: string } }) {
    const message = await chatRepository.findMessageById(messageId);
    if (!message) return failed('Message not found', StatusCodes.NOT_FOUND);
    if (String(message.sender) !== userId) return failed('You can only edit your own messages', StatusCodes.FORBIDDEN);
    if (message.recalled) return failed('This message was recalled', StatusCodes.BAD_REQUEST);
    if (message.type !== 'text') return failed('Only text messages can be edited', StatusCodes.BAD_REQUEST);

    const roomId = String(message.room);
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    if (body.cipher && room.crypto?.keyId !== body.cipher.keyId) {
      return failed('Room key changed - reload the chat', StatusCodes.CONFLICT);
    }

    if (body.cipher) {
      message.cipher = { keyId: body.cipher.keyId, iv: Buffer.from(body.cipher.iv, 'base64'), data: Buffer.from(body.cipher.data, 'base64') };
      message.content = encryptText('encrypted');
    } else {
      message.cipher = undefined;
      message.content = encryptText(body.content as string);
    }
    message.editedAt = new Date();
    const [errSave] = await to(message.save());
    if (errSave) return serverError('Error saving the message');

    // keep the room preview in sync when the newest message was the one edited
    const latest = await chatRepository.findLatestMessage(roomId);
    if (latest && String(latest._id) === messageId) await chatRepository.setLastMessage(roomId, lastMessageOf(message));

    const ids = referencedUserIds([message.toObject() as never]);
    const users = new Map((await chatRepository.findUsersByIds(ids)).map((u) => [String(u._id), toPublicUser(u)]));
    const plain = message.toObject() as ChatMessage & { _id: unknown };
    for (const m of room.members) {
      emitToUser(String(m.user), 'chat:message', { roomId, message: toPublicMessage(plain, users, String(m.user)), edited: true });
    }
    return ok('Message updated', toPublicMessage(plain, users, userId));
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

    // Keep the sender on the recalled bubble (otherwise it renders as "?" on the wrong side).
    const users = new Map((await chatRepository.findUsersByIds([userId])).map((u) => [String(u._id), toPublicUser(u)]));
    const plain = message.toObject() as ChatMessage & { _id: unknown };
    for (const m of room.members) {
      emitToUser(String(m.user), 'chat:message', { roomId, message: toPublicMessage(plain, users, String(m.user)), recalled: true });
    }
    return ok('Message recalled', toPublicMessage(plain, users, userId));
  },

  async markRead(userId: string, roomId: string) {
    const [err] = await to(chatRepository.markRead(roomId, userId));
    if (err) return serverError('Error updating read state');
    return ok('Marked as read', null);
  },
};
