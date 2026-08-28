/**
 * The chat keeps its own database (CHAT_MONGODB_URL). Users/auth stay in the main DB; chat
 * documents only reference user ids. Without the env var the chat collections live in the
 * main database so development works out of the box.
 */
import mongoose from 'mongoose';

import { env } from '@/config/env.config';
import { logger } from '@/utils/logger';

/**
 * The chat database is always this one - whatever path the URI carries (a URI without a
 * database name would otherwise silently land in Mongo's default "test").
 */
export const CHAT_DB_NAME = 'neststay-chat';

/** "user:pass@host/db" -> "host/db" for logs */
const describe = (uri: string) => uri.replace(/^(mongodb(?:\+srv)?:\/\/)[^@]*@/, '$1');

export const chatConnection: mongoose.Connection = env.CHAT_MONGODB_URL
  ? mongoose.createConnection(env.CHAT_MONGODB_URL, { dbName: CHAT_DB_NAME, serverSelectionTimeoutMS: 15_000 })
  : mongoose.connection;

if (env.CHAT_MONGODB_URL) {
  logger.info(`Chat database: connecting to ${describe(env.CHAT_MONGODB_URL)} (db "${CHAT_DB_NAME}")`);
  chatConnection.on('connected', () => logger.info(`Chat database connected (${chatConnection.name})`));
  chatConnection.on('disconnected', () => logger.warn('Chat database disconnected'));
  chatConnection.on('error', (error) =>
    logger.error(
      { err: error },
      'Chat database connection error - check CHAT_MONGODB_URL (user/password) and the Atlas Network Access allow-list for this cluster'
    )
  );
} else {
  logger.warn('CHAT_MONGODB_URL is not set - chat collections live in the main database (MONGODB_URL)');
}

/** GridFS bucket for (encrypted) image messages, on the chat database. */
export const chatImageBucket = () => {
  if (!chatConnection.db) throw new Error('Chat database is not connected yet');
  return new mongoose.mongo.GridFSBucket(chatConnection.db, { bucketName: 'chat_images' });
};
