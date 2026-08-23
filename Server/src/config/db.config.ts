import mongoose from 'mongoose';

import { env } from '@/config/env.config';
import { logger } from '@/utils/logger';

mongoose.set('strictQuery', false);
const { MONGODB_URL } = env;

const dbConnect = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URL);

    if (mongoose.connection.readyState) {
      logger.info('Mongoose connection is successful!');
    } else {
      logger.info('Mongoose connection is not open');
    }
  } catch (error) {
    logger.error('Mongoose connection failed');
    throw new Error('Mongoose connection failed', { cause: error });
  }
};

export { dbConnect };
