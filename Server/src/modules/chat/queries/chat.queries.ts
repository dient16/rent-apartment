import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { decryptBuffer, verifyImageSignature } from '../chat.crypto';
import type { ChatRoom } from '../chat.model';
import { chatRepository } from '../chat.repository';
import { memberOf, previewOf, type PublicUser, referencedUserIds, toPublicMessage, toPublicUser } from '../chat.shared';
import { searchTenorStickers, tenorEnabled } from '../chat.tenor';

type RoomDoc = ChatRoom & { _id: unknown };

const failed = (message: string, status: number) => new ServiceResponse(ResponseStatus.Failed, message, null, status);
const ok = <T>(message: string, data: T) => new ServiceResponse(ResponseStatus.Success, message, data, StatusCodes.OK);

/** Users of every member of the given rooms, one query. */
const loadUsers = async (rooms: ChatRoom[]): Promise<Map<string, PublicUser>> => {
  const ids = [...new Set(rooms.flatMap((r) => r.members.map((m) => String(m.user))))];
  const users = ids.length ? await chatRepository.findUsersByIds(ids) : [];
  return new Map(users.map((u) => [String(u._id), toPublicUser(u)]));
};

const toPublicRoom = async (room: RoomDoc, userId: string, users: Map<string, PublicUser>) => {
  const members = room.members.map((m) => ({ ...(users.get(String(m.user)) ?? { _id: String(m.user), name: 'User', avatar: null }), role: m.role }));
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
    avatar: room.type === 'group' ? null : (partner?.avatar ?? null),
    members,
    myRole: me?.role ?? 'member',
    lastMessage: last,
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
    const list = await Promise.all(docs.map((r) => toPublicRoom(r, userId, users)));
    return ok('Chats retrieved', { rooms: list, totalUnread: list.reduce((sum, r) => sum + r.unreadCount, 0) });
  },

  async getRoom(roomId: string, userId: string) {
    const room = await chatRepository.findRoomForMember(roomId, userId);
    if (!room) return failed('Room not found', StatusCodes.NOT_FOUND);
    const plain = room.toObject() as RoomDoc;
    return ok('Chat retrieved', await toPublicRoom(plain, userId, await loadUsers([plain])));
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

  async searchUsers(userId: string, q: string, limit: number) {
    const [err, users] = await to(chatRepository.searchUsers(q, userId, limit));
    if (err) return failed('Error searching users', StatusCodes.INTERNAL_SERVER_ERROR);
    return ok('Users found', users.map(toPublicUser));
  },

  /** Animated stickers from Tenor; `enabled: false` when no key is configured. */
  async searchStickers(q: string, limit: number) {
    if (!tenorEnabled()) return ok('Sticker search disabled', { enabled: false, stickers: [] });
    const [err, stickers] = await to(searchTenorStickers(q, limit));
    if (err) return failed('Sticker search failed', StatusCodes.BAD_GATEWAY);
    return ok('Stickers found', { enabled: true, stickers });
  },

  /** Decrypted image bytes for a signed URL; null when the signature is bad or the file is gone. */
  async readImage(fileId: string, exp: unknown, sig: unknown): Promise<{ data: Buffer; contentType: string } | null> {
    if (!/^[a-f0-9]{24}$/.test(fileId) || !verifyImageSignature(fileId, exp, sig)) return null;
    const file = await chatRepository.findImage(fileId);
    if (!file) return null;
    const meta = (file.metadata ?? {}) as { contentType?: string; iv?: string; tag?: string };
    if (!meta.iv || !meta.tag) return null;
    const data = decryptBuffer(await chatRepository.readImage(fileId), meta.iv, meta.tag);
    return data ? { data, contentType: meta.contentType || 'application/octet-stream' } : null;
  },
};
