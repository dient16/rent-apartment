import { z } from 'zod';

import { commonValidations } from '@/utils/commonValidation';

export const roomIdParams = z.object({ roomId: commonValidations.id });

export const createDirectSchema = z.object({
  body: z.object({ userId: commonValidations.id }),
});

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(80),
    memberIds: z.array(commonValidations.id).min(1).max(100),
  }),
});

export const renameGroupSchema = z.object({
  params: roomIdParams,
  body: z.object({ name: z.string().trim().min(1).max(80) }),
});

export const addMembersSchema = z.object({
  params: roomIdParams,
  body: z.object({ memberIds: z.array(commonValidations.id).min(1).max(100) }),
});

export const setRoleSchema = z.object({
  params: z.object({ roomId: commonValidations.id, userId: commonValidations.id }),
  // "owner" hands the group over: the current owner becomes an admin
  body: z.object({ role: z.enum(['owner', 'admin', 'member']) }),
});

export const pinMessageSchema = z.object({
  params: roomIdParams,
  body: z.object({ messageId: commonValidations.id.nullable() }),
});

export const muteSchema = z.object({
  params: roomIdParams,
  body: z.object({ muted: z.boolean() }),
});

export const memberParamsSchema = z.object({
  params: z.object({ roomId: commonValidations.id, userId: commonValidations.id }),
});

export const reactSchema = z.object({
  params: z.object({ messageId: commonValidations.id }),
  body: z.object({ emoji: z.string().trim().min(1).max(16) }),
});

export const messageParamsSchema = z.object({
  params: z.object({ messageId: commonValidations.id }),
});

const base64 = (max: number) => z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/, 'base64').max(max);
/** browser-encrypted payload: AES-GCM(roomKey) - server stores it verbatim */
export const clientCipherSchema = z.object({
  keyId: z.string().regex(/^[a-z0-9-]{6,64}$/i),
  iv: base64(32),
  data: base64(64 * 1024),
});

export const sendMessageSchema = z.object({
  params: roomIdParams,
  body: z
    .object({
      content: z.string().trim().min(1).max(4000).optional(),
      /** e2e: the encrypted body; `type` says what is inside (text / sticker / order) */
      cipher: clientCipherSchema.optional(),
      type: z.enum(['text', 'sticker']).optional().default('text'),
      replyTo: commonValidations.id.optional(),
      /** ids of the members named with @ in this message */
      mentions: z.array(commonValidations.id).max(50).optional(),
    })
    .refine((b) => !!b.content || !!b.cipher, { message: 'content or cipher is required' }),
});

export const listMediaSchema = z.object({
  params: roomIdParams,
  query: z.object({
    limit: z.coerce.number().int().min(1).max(60).optional().default(30),
    before: commonValidations.id.optional(),
  }),
});

/** Edit the body of a text message you sent (plain or encrypted). */
export const editMessageSchema = z.object({
  params: z.object({ messageId: commonValidations.id }),
  body: z
    .object({ content: z.string().trim().min(1).max(4000).optional(), cipher: clientCipherSchema.optional() })
    .refine((b) => !!b.content || !!b.cipher, { message: 'content or cipher is required' }),
});


export const listMessagesSchema = z.object({
  params: roomIdParams,
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(30),
    /** message id - return messages created before it (older page) */
    before: commonValidations.id.optional(),
  }),
});

export const linkPreviewSchema = z.object({
  query: z.object({ url: z.string().url().max(2048) }),
});

export const searchUsersSchema = z.object({
  query: z.object({ q: z.string().trim().min(1).max(60), limit: z.coerce.number().int().min(1).max(20).optional().default(10) }),
});
