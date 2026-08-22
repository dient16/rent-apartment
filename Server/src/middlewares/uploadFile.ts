import crypto from 'node:crypto';
import path from 'node:path';

import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';

import { env } from '@/config/env.config';

const { MONGODB_URL } = env;
const storage = new GridFsStorage({
  url: MONGODB_URL,
  file: (_req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }

        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'images',
        };
        resolve(fileInfo);
      });
    });
  },
});

const upload = multer({ storage });

export default upload;
