import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { env } from '@/config/env.config';

import { decryptBuffer, signImagePath, verifyImageSignature } from '../chat.crypto';
import type { ChatMessage, ChatRoom } from '../chat.model';
import { chatRepository } from '../chat.repository';
import { memberOf, previewOf, publicCipher, type PublicUser, referencedUserIds, toPublicMessage, toPublicUser } from '../chat.shared';

type RoomDoc = ChatRoom & { _id: unknown };

const failed = (message: string, status: number) => new ServiceResponse(ResponseStatus.Failed, message, null, status);
const ok = <T>(message: string, data: T) => new ServiceResponse(ResponseStatus.Success, message, data, StatusCodes.OK);

/** Users of every member of the given rooms, one query. */
const loadUsers = async (rooms: ChatRoom[]): Promise<Map<string, PublicUser>> => {
  const ids = [...new Set(rooms.flatMap((r) => r.members.map((m) => String(m.user))))];
  const users = ids.length ? await chatRepository.findUsersByIds(ids) : [];
  return new Map(users.map((u) => [String(u._id), toPublicUser(u)]));
};

const toPublicRoom = async (
  room: RoomDoc,
  userId: string,
  users: Map<string, PublicUser>,
  pinned?: (ChatMessage & { _id: unknown }) | null
) => {
  const members = room.members.map((m) => ({
    ...(users.get(String(m.user)) ?? { _id: String(m.user), name: 'User', avatar: null }),
    role: m.role,
    /** used for "seen by" ticks under the newest message */
    lastReadAt: m.lastReadAt,
  }));
  const partner = room.type === 'direct' ? members.find((m) => m._id !== userId) : undefined;
  const me = memberOf(room, userId);
  const unreadCount = me ? await chatRepository.countUnread(String(room._id), userId, me.lastReadAt) : 0;
  const last = room.lastMessage?.content
    ? {
        content: previewOf(room.lastMessage),
        type: room.lastMessage.type,
        recalled: !!room.lastMessage.recalled,
        senderName: room.lastMessage.sender ? (users.get(String(room.lastMessage.sender))?.name ?? '') : '',
        isMine: room.lastMessage.sender ? String(room.lastMessage.sender) === userId : false,
        createdAt: room.lastMessage.createdAt,
      }
    : null;
  return {
    _id: String(room._id),
    type: room.type,
    name: room.type === 'group' ? room.name : (partner?.name ?? 'User'),
    avatar: room.type === 'group' ? (room.avatar ? `${env.SERVER_URL}${signImagePath(room.avatar)}` : null) : (partner?.avatar ?? null),
    members,
    myRole: me?.role ?? 'member',
    muted: !!me?.muted,
    /** message pinned to the top of the room (already in the public shape) */
    pinned: pinned ? toPublicMessage(pinned, users, userId) : null,
    lastMessage: last
      ? { ...last, cipher: room.lastMessage?.cipher ? publicCipher(room.lastMessage.cipher) : null }
      : null,
    unreadCount,
    updatedAt: room.updatedAt,
  };
};

export const chatQueries = {
  async listRooms(userId: string) {
    const [err, rooms] = await to(chatRepository.findRoomsForUser(userId));
    if (err) return failed('Error loading chats', StatusCodes.INTERNAL_SERVER_ERROR);
    const docs = rooms as RoomDoc[];
    const users = await loadUsers(docs);
    // pinned messages of every room in one query
    const pinnedIds = docs.map((r) => (r.pinnedMessage ? String(r.pinnedMessage) : '')).filter(Boolean);
    const pinnedDocs = pinnedIds.length ? await chatRepository.findMessagesByIds(pinnedIds) : [];
    const pinnedById = new Map(pinnedDocs.map((m) => [String(m._id), m as ChatMessage & { _id: unknown }]));
    const list = await Promise.all(
      docs.map((r) => toPublicRoom(r, userId, users, r.pinnedMessage ? (pinnedById.get(String(r.pinnedMessage)) ?? null) : null))
    );
    return ok('Chats retrieved', { rooms: list, totalUnread: list.reduce((sum, r) => sum + r.unreadCount, 0) });
  },

  async getRoom(roomId: string, userId: string) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    const plain = room.toObject() as RoomDoc;
    const pinned = plain.pinnedMessage ? ((await chatRepository.findMessagesByIds([String(plain.pinnedMessage)]))[0] ?? null) : null;
    return ok('Chat retrieved', await toPublicRoom(plain, userId, await loadUsers([plain]), pinned as never));
  },

  /** Newest page first; `before` pages further back. */
  async listMessages(roomId: string, userId: string, limit: number, before?: string) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    const [err, docs] = await to(chatRepository.findMessages(roomId, limit + 1, before));
    if (err) return failed('Error loading messages', StatusCodes.INTERNAL_SERVER_ERROR);
    const hasMore = docs.length > limit;
    const page = docs.slice(0, limit).reverse();
    const users = await loadUsers([room.toObject() as RoomDoc]);
    // senders who already left the group are not in `members`
    const quotedIds = [...new Set(page.map((m) => (m.replyTo ? String(m.replyTo) : '')).filter(Boolean))];
    const quoted = new Map((quotedIds.length ? await chatRepository.findMessagesByIds(quotedIds) : []).map((q) => [String(q._id), q]));
    // senders + reactors (some may have left the group), one lookup
    const missing = referencedUserIds([...page, ...quoted.values()] as never).filter((id) => !users.has(id));
    if (missing.length) for (const u of await chatRepository.findUsersByIds(missing)) users.set(String(u._id), toPublicUser(u));
    const messages = page.map((m) => toPublicMessage(m as never, users, userId, m.replyTo ? (quoted.get(String(m.replyTo)) as never) ?? null : null));
    return ok('Messages retrieved', { messages, hasMore });
  },

  /** Every photo shared in a room, newest first - the group media tab. */
  async listMedia(roomId: string, userId: string, limit: number, before?: string) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    const [err, docs] = await to(chatRepository.findMedia(roomId, limit + 1, before));
    if (err) return failed('Error loading media', StatusCodes.INTERNAL_SERVER_ERROR);
    const hasMore = docs.length > limit;
    const page = docs.slice(0, limit);
    const users = await loadUsers([room.toObject() as RoomDoc]);
    const missing = referencedUserIds(page as never).filter((id) => !users.has(id));
    if (missing.length) for (const u of await chatRepository.findUsersByIds(missing)) users.set(String(u._id), toPublicUser(u));
    return ok('Media retrieved', { media: page.map((m) => toPublicMessage(m as never, users, userId)), hasMore });
  },

  async searchUsers(userId: string, q: string, limit: number) {
    const [err, users] = await to(chatRepository.searchUsers(q, userId, limit));
    if (err) return failed('Error searching users', StatusCodes.INTERNAL_SERVER_ERROR);
    return ok('Users found', users.map(toPublicUser));
  },


  /** Image bytes for a signed URL; browser-encrypted files come back as they are stored. */
  async readImage(fileId: string, exp: unknown, sig: unknown): Promise<{ data: Buffer; contentType: string; e2e: boolean } | null> {
    if (!/^[a-f0-9]{24}$/.test(fileId) || !verifyImageSignature(fileId, exp, sig)) return null;
    const file = await chatRepository.findImage(fileId);
    if (!file) return null;
    const meta = (file.metadata ?? {}) as { contentType?: string; iv?: string; tag?: string; e2e?: boolean };
    const raw = await chatRepository.readImage(fileId);
    if (meta.e2e) return { data: raw, contentType: 'application/octet-stream', e2e: true };
    if (!meta.iv || !meta.tag) return null;
    const data = decryptBuffer(raw, meta.iv, meta.tag);
    return data ? { data, contentType: meta.contentType || 'application/octet-stream', e2e: false } : null;
  },

};
