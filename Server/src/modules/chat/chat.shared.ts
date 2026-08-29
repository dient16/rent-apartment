import { toAvatarUrl } from '@/modules/message/message.shared';
import { env } from '@/config/env.config';

import { decryptText, signImagePath } from './chat.crypto';
import type { ChatMember, ChatMessage, ChatRoom, ClientCipher } from './chat.model';

const b64 = (v: Buffer | { buffer: Buffer } | undefined | null) =>
  !v ? '' : Buffer.isBuffer(v) ? v.toString('base64') : Buffer.isBuffer(v.buffer) ? v.buffer.toString('base64') : '';

/** wire form of a browser-side cipher (base64 strings) */
export const publicCipher = (c: ClientCipher | undefined | null) => (c?.keyId ? { keyId: c.keyId, iv: b64(c.iv), data: b64(c.data) } : null);

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
  if (message.cipher) return '🔒 Encrypted message';
  return decryptText(message.content) ?? '';
};

/** Grouped reactions: one chip per emoji with the count, who reacted, and whether the caller did. */
const groupReactions = (reactions: ChatMessage['reactions'] | undefined, userId: string, users: Map<string, PublicUser>) => {
  const groups = new Map<string, { emoji: string; count: number; mine: boolean; users: string[] }>();
  for (const r of reactions ?? []) {
    const g = groups.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false, users: [] };
    g.count += 1;
    const id = String(r.user);
    if (id === String(userId)) g.mine = true;
    g.users.push(users.get(id)?.name ?? 'Someone');
    groups.set(r.emoji, g);
  }
  return [...groups.values()];
};

/** Ids of everyone referenced by a page of messages (senders + reactors), for one user lookup. */
export const referencedUserIds = (messages: ChatMessage[]): string[] => [
  ...new Set(messages.flatMap((m) => [m.sender ? String(m.sender) : '', ...(m.reactions ?? []).map((r) => String(r.user))]).filter(Boolean)),
];

/**
 * What members see: decrypted text, a signed image URL, a sticker id - never the raw payload.
 * `quoted` is the message this one replies to (already loaded by the caller).
 */
export const toPublicMessage = (message: MessageDoc, users: Map<string, PublicUser>, userId: string, quoted?: MessageDoc | null) => {
  const e2e = !!message.cipher;
  const plain = message.recalled || e2e ? null : decryptText(message.content);
  const fileId = message.type === 'image' && !message.recalled ? decryptText(message.content) : null;
  return {
    _id: String(message._id),
    type: message.type,
    content: message.type === 'text' || message.type === 'system' ? (plain ?? (message.recalled || e2e ? '' : '[unable to decrypt]')) : '',
    /** end-to-end body - only the members' browsers can open it (text / sticker id / order JSON) */
    cipher: message.recalled ? null : publicCipher(message.cipher),
    imageUrl: fileId ? `${env.SERVER_URL}${signImagePath(fileId)}` : null,
    /** e2e photos: the bytes behind imageUrl are AES-GCM encrypted with this iv (base64) */
    image: message.type === 'image' && message.image?.e2e ? { keyId: message.cipher?.keyId ?? '', iv: b64(message.image.iv) } : null,
    sticker: message.type === 'sticker' ? plain : null,
    album: message.album ?? null,
    recalled: !!message.recalled,
    editedAt: message.editedAt ?? null,
    mentions: (message.mentions ?? []).map(String),
    reactions: groupReactions(message.reactions, userId, users),
    replyTo: quoted
      ? {
          _id: String(quoted._id),
          type: quoted.type,
          preview: summarize(quoted).slice(0, 140),
          cipher: quoted.recalled ? null : publicCipher(quoted.cipher),
          quotedType: quoted.type,
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
  if (last.cipher) return '🔒 Encrypted message';
  return decryptText(last.content) ?? '';
};
