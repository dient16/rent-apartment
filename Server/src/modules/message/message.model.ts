import type { Document } from 'mongoose';
import mongoose from 'mongoose';

export interface Conversation {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: {
    content: string;
    sender: mongoose.Types.ObjectId;
    createdAt: Date;
  };
}

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: {
      content: { type: String },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

export interface Message {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  isRead: boolean;
  reactions: { user: mongoose.Types.ObjectId; emoji: string }[];
  createdAt?: Date;
}

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
    isRead: { type: Boolean, default: false },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        emoji: { type: String, required: true, maxlength: 16 },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export const ConversationModel = mongoose.model<Conversation & Document>(
  'Conversation',
  conversationSchema,
  'conversations'
);
export const MessageModel = mongoose.model<Message & Document>('Message', messageSchema, 'messages');
