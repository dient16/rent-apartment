import type { Readable } from 'node:stream';

import { default as to } from 'await-to-js';
import type { GridFSBucket } from 'mongodb';
import type { Connection } from 'mongoose';
import mongoose from 'mongoose';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';

const { MONGODB_URL, SERVER_URL } = env;
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

export const uploadImageService = async (filename: string): Promise<ServiceResponse<string | null>> => {
  if (filename) {
    return new ServiceResponse<string>(
      ResponseStatus.Success,
      'Image uploaded successfully',
      `${SERVER_URL}/api/image/${filename}`,
      200
    );
  }
  return new ServiceResponse<string | null>(ResponseStatus.Failed, 'Error upload image', null, 500);
};

export const openImageBrowserService = async (filename: string): Promise<ServiceResponse<Readable | null>> => {
  const gfs = await gfsPromise;
  const [err, files] = await to(gfs.find({ filename }).toArray());

  if (err) {
    return new ServiceResponse<Readable | null>(ResponseStatus.Failed, 'Error preview image', null, 500);
  }

  if (!files || files.length === 0) {
    return new ServiceResponse<Readable | null>(ResponseStatus.Failed, 'No image exist', null, 404);
  }

  return new ServiceResponse<Readable>(
    ResponseStatus.Success,
    'Image retrieved successfully',
    gfs.openDownloadStreamByName(filename),
    200
  );
};

export const getRecentFileService = async (): Promise<ServiceResponse<any | null>> => {
  const gfs = await gfsPromise;
  const [err, files] = await to(gfs.find().sort({ uploadDate: -1 }).limit(1).toArray());

  if (err) {
    return new ServiceResponse<any>(ResponseStatus.Failed, 'Error fetching recent file', null, 500);
  }

  if (!files || files.length === 0) {
    return new ServiceResponse<any>(ResponseStatus.Failed, 'No files available', null, 404);
  }

  return new ServiceResponse<any>(ResponseStatus.Success, 'Recent file retrieved successfully', files[0], 200);
};

export const getAllFilesService = async (): Promise<ServiceResponse<any[]>> => {
  const gfs = await gfsPromise;
  const [err, files] = await to(gfs.find().toArray());

  if (err) {
    return new ServiceResponse<any[]>(ResponseStatus.Failed, 'Error fetching files', [], 500);
  }

  if (!files || files.length === 0) {
    return new ServiceResponse<any[]>(ResponseStatus.Failed, 'No files available', [], 404);
  }

  const fileDetails = files.map((file: any) => ({
    ...file,
    isImage: ['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.contentType),
  }));

  return new ServiceResponse<any[]>(ResponseStatus.Success, 'Files retrieved successfully', fileDetails, 200);
};

export const getFileByFilenameService = async (filename: string): Promise<ServiceResponse<any | null>> => {
  const gfs = await gfsPromise;
  const [err, files] = await to(gfs.find({ filename }).toArray());

  if (err) {
    return new ServiceResponse(ResponseStatus.Failed, 'Error fetching file', null, 500);
  }

  if (!files[0] || files.length === 0) {
    return new ServiceResponse(ResponseStatus.Failed, 'File not found', null, 404);
  }

  return new ServiceResponse(ResponseStatus.Success, 'File retrieved successfully', files[0], 200);
};

export const deleteFileByFileNameService = async (filename: string): Promise<ServiceResponse<any>> => {
  const gfs = await gfsPromise;
  const [findErr, files] = await to(gfs.find({ filename }).toArray());

  if (findErr || !files || files.length === 0) {
    return new ServiceResponse(ResponseStatus.Failed, 'File not found', null, 404);
  }

  const [deleteErr, result] = await to(gfs.delete(new mongoose.Types.ObjectId(files[0]._id)));

  if (deleteErr) {
    return new ServiceResponse(ResponseStatus.Failed, 'Error deleting file', null, 500);
  }

  return new ServiceResponse(ResponseStatus.Success, 'File deleted successfully', result, 200);
};
