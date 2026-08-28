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
}

export interface ChatLastMessage {
  type: ChatMessageType;
  content: EncryptedText;
  sender?: mongoose.Types.ObjectId;
  createdAt: Date;
  recalled?: boolean;
}

export interface ChatRoom {
  type: ChatRoomType;
  name?: string;
  members: ChatMember[];
  createdBy: mongoose.Types.ObjectId;
  /** direct rooms: sorted "userA:userB" so the pair is unique */
  directKey?: string;
  lastMessage?: ChatLastMessage;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatReaction {
  user: mongoose.Types.ObjectId;
  emoji: string;
}

export interface ChatMessage {
  room: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId;
  type: ChatMessageType;
  /** text: the message; sticker: "<pack>/<id>"; image: GridFS file id; system: the line */
  content: EncryptedText;
  image?: { contentType: string; size: number };
  /** quoted message (same room) */
  replyTo?: mongoose.Types.ObjectId;
  reactions: ChatReaction[];
  recalled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const encryptedSchema = new mongoose.Schema(
  { iv: { type: String, required: true }, tag: { type: String, required: true }, data: { type: String, required: true } },
  { _id: false }
);

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date, default: () => new Date(0) },
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
    lastMessage: {
      type: { type: String, enum: MESSAGE_TYPES },
      content: encryptedSchema,
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
    image: { contentType: String, size: Number },
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
  },
  { timestamps: true }
);
messageSchema.index({ room: 1, createdAt: -1 });

export const ChatRoomModel = chatConnection.model<ChatRoom & Document>('ChatRoom', roomSchema, 'chat_rooms');
export const ChatMessageModel = chatConnection.model<ChatMessage & Document>('ChatMessage', messageSchema, 'chat_messages');
