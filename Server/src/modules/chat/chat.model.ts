/**
 * Standalone chat: rooms (direct / group) and encrypted messages, on the chat database.
 * Model names and collections are distinct from the listing messenger.
 */
import type { Document } from 'mongoose';
import mongoose from 'mongoose';

import type { EncryptedText } from './chat.crypto';
import { chatConnection } from './chat.db';

export type ChatRoomType = 'direct' | 'group';
export type ChatMemberRole = 'owner' | 'admin' | 'member';
export type ChatMessageType = 'text' | 'image' | 'sticker' | 'system';

export interface ChatMember {
  user: mongoose.Types.ObjectId;
  role: ChatMemberRole;
  joinedAt: Date;
  /** everything created after this is unread for the member */
  lastReadAt: Date;
  /** the member muted this room: no browser notifications, no unread badge */
  muted?: boolean;
}

export interface ChatLastMessage {
  type: ChatMessageType;
  content: EncryptedText;
  cipher?: ClientCipher;
  sender?: mongoose.Types.ObjectId;
  createdAt: Date;
  recalled?: boolean;
}

export interface ChatRoom {
  type: ChatRoomType;
  name?: string;
  members: ChatMember[];
  createdBy: mongoose.Types.ObjectId;
  /**
   * Transport encryption: members encrypt message bodies in the browser with this key, so an
   * API request only ever carries ciphertext. The key itself is stored encrypted at rest and
   * handed to any member of the room, so every device can read the history.
   */
  crypto?: { keyId: string; key: EncryptedText; createdAt: Date };
  /** direct rooms: sorted "userA:userB" so the pair is unique */
  directKey?: string;
  /** message kept at the top of the room for everyone */
  pinnedMessage?: mongoose.Types.ObjectId;
  /** group photo: GridFS file id (stored like any chat image) */
  avatar?: string;
  lastMessage?: ChatLastMessage;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatReaction {
  user: mongoose.Types.ObjectId;
  emoji: string;
}

/** Body encrypted in the browser with the room key (AES-GCM). */
export interface ClientCipher {
  keyId: string;
  iv: Buffer;
  data: Buffer;
}

export interface ChatMessage {
  room: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId;
  type: ChatMessageType;
  /** server-encrypted body (legacy / system messages); empty for e2e messages */
  content: EncryptedText;
  /** e2e messages: text / sticker id / order JSON encrypted in the browser */
  cipher?: ClientCipher;
  image?: { contentType: string; size: number; e2e?: boolean; iv?: Buffer };
  /** photos sent together share an album id (client-generated) and render as one grid */
  album?: string;
  /** quoted message (same room) */
  replyTo?: mongoose.Types.ObjectId;
  reactions: ChatReaction[];
  recalled: boolean;
  /** set when the sender edited the body */
  editedAt?: Date;
  /** members named with @ - the body itself is encrypted, so the ids travel next to it */
  mentions?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// ciphertext as BSON Binary (see chat.crypto.ts) - ~25% smaller than base64 strings
const encryptedSchema = new mongoose.Schema(
  { iv: { type: Buffer, required: true }, tag: { type: Buffer, required: true }, data: { type: Buffer, required: true } },
  { _id: false }
);

const clientCipherSchema = new mongoose.Schema(
  { keyId: { type: String, required: true, maxlength: 64 }, iv: { type: Buffer, required: true }, data: { type: Buffer, required: true } },
  { _id: false }
);

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date, default: () => new Date(0) },
    muted: { type: Boolean, default: false },
  },
  { _id: false }
);

const MESSAGE_TYPES = ['text', 'image', 'sticker', 'system'];

const roomSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['direct', 'group'], required: true },
    name: { type: String, trim: true, maxlength: 80 },
    members: { type: [memberSchema], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    directKey: { type: String },
    pinnedMessage: { type: mongoose.Schema.Types.ObjectId },
    avatar: { type: String },
    crypto: { keyId: { type: String }, key: encryptedSchema, createdAt: Date },
    lastMessage: {
      type: { type: String, enum: MESSAGE_TYPES },
      content: encryptedSchema,
      cipher: clientCipherSchema,
      sender: { type: mongoose.Schema.Types.ObjectId },
      createdAt: Date,
      recalled: Boolean,
    },
  },
  { timestamps: true }
);
roomSchema.index({ 'members.user': 1, updatedAt: -1 });
roomSchema.index({ directKey: 1 }, { unique: true, sparse: true });

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId },
    type: { type: String, enum: MESSAGE_TYPES, default: 'text' },
    content: { type: encryptedSchema, required: true },
    cipher: clientCipherSchema,
    image: { contentType: String, size: Number, e2e: Boolean, iv: Buffer },
    album: { type: String, maxlength: 40 },
    replyTo: { type: mongoose.Schema.Types.ObjectId },
    reactions: {
      type: [
        new mongoose.Schema(
          { user: { type: mongoose.Schema.Types.ObjectId, required: true }, emoji: { type: String, required: true, maxlength: 16 } },
          { _id: false }
        ),
      ],
      default: [],
    },
    recalled: { type: Boolean, default: false },
    editedAt: { type: Date },
    mentions: { type: [mongoose.Schema.Types.ObjectId], default: undefined },
  },
  { timestamps: true }
);
messageSchema.index({ room: 1, createdAt: -1 });

export const ChatRoomModel = chatConnection.model<ChatRoom & Document>('ChatRoom', roomSchema, 'chat_rooms');
export const ChatMessageModel = chatConnection.model<ChatMessage & Document>('ChatMessage', messageSchema, 'chat_messages');
