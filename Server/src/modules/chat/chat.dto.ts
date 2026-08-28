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
  body: z.object({ role: z.enum(['admin', 'member']) }),
});

export const memberParamsSchema = z.object({
  params: z.object({ roomId: commonValidations.id, userId: commonValidations.id }),
});

export const sendStickerSchema = z.object({
  params: roomIdParams,
  body: z.object({ sticker: z.string().max(400), replyTo: commonValidations.id.optional() }),
});

export const reactSchema = z.object({
  params: z.object({ messageId: commonValidations.id }),
  body: z.object({ emoji: z.string().trim().min(1).max(16) }),
});

export const messageParamsSchema = z.object({
  params: z.object({ messageId: commonValidations.id }),
});

export const sendMessageSchema = z.object({
  params: roomIdParams,
  body: z.object({ content: z.string().trim().min(1).max(4000), replyTo: commonValidations.id.optional() }),
});

export const listMessagesSchema = z.object({
  params: roomIdParams,
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(30),
    /** message id - return messages created before it (older page) */
    before: commonValidations.id.optional(),
  }),
});

export const searchStickersSchema = z.object({
  query: z.object({ q: z.string().trim().max(60).optional().default(''), limit: z.coerce.number().int().min(1).max(40).optional().default(24) }),
});

export const searchUsersSchema = z.object({
  query: z.object({ q: z.string().trim().min(1).max(60), limit: z.coerce.number().int().min(1).max(20).optional().default(10) }),
});
