import mongoose from 'mongoose';

import UserModel from '@/modules/user/user.model';

import { chatImageBucket } from './chat.db';
import type { ChatLastMessage, ChatMember, ChatMessage } from './chat.model';
import { ChatMessageModel, ChatRoomModel } from './chat.model';

const oid = (id: string) => new mongoose.Types.ObjectId(id);

export const USER_PUBLIC = 'firstname lastname avatar email';

type UserLean = { _id: unknown; firstname?: string; lastname?: string; avatar?: string | null; email?: string };
const USER_CACHE_TTL_MS = 60_000;
const userCache = new Map<string, { user: UserLean; expires: number }>();

/** Users by id with a 60s memory cache - saves a main-DB round trip on every send / react. */
const findUsersCached = async (ids: string[]): Promise<UserLean[]> => {
  const now = Date.now();
  const hits: UserLean[] = [];
  const misses: string[] = [];
  for (const id of new Set(ids)) {
    const cached = userCache.get(id);
    if (cached && cached.expires > now) hits.push(cached.user);
    else misses.push(id);
  }
  if (misses.length) {
    const fresh = (await UserModel.find({ _id: { $in: misses } } as never)
      .select(USER_PUBLIC)
      .lean()) as unknown as UserLean[];
    for (const u of fresh) userCache.set(String(u._id), { user: u, expires: now + USER_CACHE_TTL_MS });
    hits.push(...fresh);
  }
  return hits;
};

/** All database access for the chat module (users: main DB; rooms/messages/images: chat DB). */
export const chatRepository = {
  /* ---- users (main database; UserModel types _id as a string) ---- */
  findUsersByIds: (ids: string[]) => findUsersCached(ids),

  searchUsers: (q: string, excludeId: string, limit: number) => {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return UserModel.find({
      _id: { $ne: excludeId },
      $or: [{ firstname: regex }, { lastname: regex }, { email: regex }],
    } as never)
      .select(USER_PUBLIC)
      .limit(limit)
      .lean();
  },

  /* ---- rooms ---- */
  findRoomForMember: (roomId: string, userId: string) =>
    ChatRoomModel.findOne({ _id: oid(roomId), 'members.user': oid(userId) }),

  findRoomsForUser: (userId: string) =>
    ChatRoomModel.find({ 'members.user': oid(userId) })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean(),

  findDirectRoom: (directKey: string) => ChatRoomModel.findOne({ directKey }),

  createRoom: (data: { type: 'direct' | 'group'; name?: string; members: ChatMember[]; createdBy: string; directKey?: string }) =>
    ChatRoomModel.create({ ...data, createdBy: oid(data.createdBy) }),

  setLastMessage: (roomId: string, lastMessage: ChatLastMessage) =>
    ChatRoomModel.updateOne({ _id: oid(roomId) }, { $set: { lastMessage, updatedAt: new Date() } }),

  markRead: (roomId: string, userId: string) =>
    ChatRoomModel.updateOne({ _id: oid(roomId), 'members.user': oid(userId) }, { $set: { 'members.$.lastReadAt': new Date() } }),

  /* ---- messages ---- */
  createMessage: (
    data: Pick<ChatMessage, 'room' | 'type' | 'content'> & {
      sender?: mongoose.Types.ObjectId;
      image?: ChatMessage['image'];
      replyTo?: mongoose.Types.ObjectId;
    }
  ) => ChatMessageModel.create(data),

  findMessageById: (messageId: string) => ChatMessageModel.findById(messageId),

  findMessagesByIds: (ids: string[]) => ChatMessageModel.find({ _id: { $in: ids.map(oid) } }).lean(),

  findLatestMessage: (roomId: string) => ChatMessageModel.findOne({ room: oid(roomId) }).sort({ _id: -1 }).lean(),

  findMessages: (roomId: string, limit: number, before?: string) =>
    ChatMessageModel.find({ room: oid(roomId), ...(before ? { _id: { $lt: oid(before) } } : {}) })
      .sort({ _id: -1 })
      .limit(limit)
      .lean(),

  countUnread: (roomId: string, userId: string, since: Date) =>
    ChatMessageModel.countDocuments({ room: oid(roomId), createdAt: { $gt: since }, sender: { $ne: oid(userId) }, type: { $ne: 'system' } }),

  /* ---- images (GridFS on the chat database; bytes arrive already encrypted) ---- */
  storeImage: (data: Buffer, metadata: { contentType: string; iv: string; tag: string; room: string; sender: string }): Promise<string> =>
    new Promise((resolve, reject) => {
      const stream = chatImageBucket().openUploadStream(`${Date.now()}`, { metadata });
      stream.on('finish', () => resolve(String(stream.id)));
      stream.on('error', reject);
      stream.end(data);
    }),

  findImage: async (fileId: string) => {
    const files = await chatImageBucket()
      .find({ _id: oid(fileId) })
      .toArray();
    return files[0] ?? null;
  },

  readImage: (fileId: string): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      chatImageBucket()
        .openDownloadStream(oid(fileId))
        .on('data', (chunk: Buffer) => chunks.push(chunk))
        .on('error', reject)
        .on('end', () => resolve(Buffer.concat(chunks)));
    }),

  deleteImage: (fileId: string) => chatImageBucket().delete(oid(fileId)),
};
