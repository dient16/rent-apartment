import type { GridFSBucket } from 'mongodb';
import type { Connection } from 'mongoose';
import mongoose from 'mongoose';

import { env } from '@/config/env.config';

const { MONGODB_URL } = env;
const conn: Connection = mongoose.createConnection(MONGODB_URL);

const gfsPromise = new Promise<GridFSBucket>((resolve, reject) => {
  conn.once('open', () => {
    const gfs = new mongoose.mongo.GridFSBucket(conn.db!, {
      bucketName: 'images',
    });
    resolve(gfs);
  });

  conn.on('error', (error) => {
    reject(error);
  });
});

/** GridFS access for images lives here — one shared bucket connection. */
export const imageRepository = {
  findByFilename: async (filename: string, limit = 0) => {
    const gfs = await gfsPromise;
    return gfs.find({ filename }, limit ? { limit } : undefined).toArray();
  },

  findMostRecent: async () => {
    const gfs = await gfsPromise;
    return gfs.find().sort({ uploadDate: -1 }).limit(1).toArray();
  },

  findAll: async () => {
    const gfs = await gfsPromise;
    return gfs.find().toArray();
  },

  openDownloadStream: async (fileId: mongoose.mongo.BSON.ObjectId) => {
    const gfs = await gfsPromise;
    return gfs.openDownloadStream(fileId);
  },

  deleteById: async (fileId: mongoose.Types.ObjectId) => {
    const gfs = await gfsPromise;
    return gfs.delete(fileId);
  },
};
