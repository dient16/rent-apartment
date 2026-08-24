import { z } from 'zod';

import { commonValidations } from '@/utils/commonValidation';

export const startConversationSchema = z.object({
  body: z.object({
    recipientId: commonValidations.id,
  }),
});

export const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1, 'Message cannot be empty').max(2000),
  }),
  params: z.object({
    conversationId: commonValidations.id,
  }),
});

export const reactMessageSchema = z.object({
  body: z.object({
    emoji: z.string().trim().min(1).max(16),
  }),
  params: z.object({
    messageId: commonValidations.id,
  }),
});
