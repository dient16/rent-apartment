/**
 * The chat keeps its own database (CHAT_MONGODB_URL). Users/auth stay in the main DB; chat
 * documents only reference user ids. Without the env var the chat collections live in the
 * main database so development works out of the box.
 */
import mongoose from 'mongoose';

import { env } from '@/config/env.config';
import { logger } from '@/utils/logger';

export const chatConnection: mongoose.Connection = env.CHAT_MONGODB_URL
  ? mongoose.createConnection(env.CHAT_MONGODB_URL)
  : mongoose.connection;

if (env.CHAT_MONGODB_URL) {
  chatConnection.on('connected', () => logger.info(`Chat database connected (${chatConnection.name})`));
  chatConnection.on('error', (error) => logger.error({ err: error }, 'Chat database connection error'));
}

/** GridFS bucket for (encrypted) image messages, on the chat database. */
export const chatImageBucket = () => {
  if (!chatConnection.db) throw new Error('Chat database is not connected yet');
  return new mongoose.mongo.GridFSBucket(chatConnection.db, { bucketName: 'chat_images' });
};
