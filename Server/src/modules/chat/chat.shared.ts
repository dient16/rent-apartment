import { toAvatarUrl } from '@/modules/message/message.shared';
import { env } from '@/config/env.config';

import { decryptText, signImagePath } from './chat.crypto';
import type { ChatMember, ChatMessage, ChatRoom } from './chat.model';

export interface PublicUser {
  _id: string;
  name: string;
  avatar: string | null;
  email?: string;
}

export const toPublicUser = (user: any): PublicUser => ({
  _id: String(user._id),
  name: [user.firstname, user.lastname].filter(Boolean).join(' ') || user.email || 'User',
  avatar: (user.avatar ? toAvatarUrl(user.avatar) : null) ?? null,
  email: user.email,
});

export const directKeyFor = (a: string, b: string) => [a, b].sort().join(':');

export const memberOf = (room: ChatRoom, userId: string): ChatMember | undefined =>
  room.members.find((m) => String(m.user) === String(userId));

export const canManage = (room: ChatRoom, userId: string) => {
  const role = memberOf(room, userId)?.role;
  return role === 'owner' || role === 'admin';
};

/**
 * Sticker ids are "<pack>/<name>" (client/public/stickers/<pack>/<name>.<ext>) or a Tenor
 * media URL picked from the GIF tab (only media.tenor.com is accepted).
 */
export const STICKER_ID = /^([a-z0-9]+\/[a-z0-9_]+(\.(webp|gif|png))?|https:\/\/media\.tenor\.com\/[\w./-]+\.(gif|webp|png))$/;

type MessageDoc = ChatMessage & { _id: unknown };

/** One line describing a message, for quotes and previews. */
export const summarize = (message: MessageDoc): string => {
  if (message.recalled) return 'Message recalled';
  if (message.type === 'image') return '📷 Photo';
  if (message.type === 'sticker') return '🙂 Sticker';
  return decryptText(message.content) ?? '';
};

/** Grouped reactions: one chip per emoji with the count and whether the caller reacted. */
const groupReactions = (reactions: ChatMessage['reactions'] | undefined, userId: string) => {
  const groups = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const r of reactions ?? []) {
    const g = groups.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    g.count += 1;
    if (String(r.user) === String(userId)) g.mine = true;
    groups.set(r.emoji, g);
  }
  return [...groups.values()];
};

/**
 * What members see: decrypted text, a signed image URL, a sticker id - never the raw payload.
 * `quoted` is the message this one replies to (already loaded by the caller).
 */
export const toPublicMessage = (message: MessageDoc, users: Map<string, PublicUser>, userId: string, quoted?: MessageDoc | null) => {
  const plain = message.recalled ? null : decryptText(message.content);
  return {
    _id: String(message._id),
    type: message.type,
    content: message.type === 'text' || message.type === 'system' ? (plain ?? (message.recalled ? '' : '[unable to decrypt]')) : '',
    imageUrl: message.type === 'image' && plain ? `${env.SERVER_URL}${signImagePath(plain)}` : null,
    sticker: message.type === 'sticker' ? plain : null,
    recalled: !!message.recalled,
    reactions: groupReactions(message.reactions, userId),
    replyTo: quoted
      ? {
          _id: String(quoted._id),
          type: quoted.type,
          preview: summarize(quoted).slice(0, 140),
          senderName: quoted.sender ? (users.get(String(quoted.sender))?.name ?? 'User') : 'System',
          recalled: !!quoted.recalled,
        }
      : message.replyTo
        ? { _id: String(message.replyTo), type: 'text' as const, preview: 'Original message unavailable', senderName: '', recalled: true }
        : null,
    sender: message.sender ? (users.get(String(message.sender)) ?? null) : null,
    isMine: message.sender ? String(message.sender) === String(userId) : false,
    createdAt: message.createdAt,
  };
};

/** One-line preview for the room list. */
export const previewOf = (last: ChatRoom['lastMessage']): string => {
  if (!last) return '';
  if (last.recalled) return 'Message recalled';
  if (last.type === 'image') return '📷 Photo';
  if (last.type === 'sticker') return '🙂 Sticker';
  return decryptText(last.content) ?? '';
};
