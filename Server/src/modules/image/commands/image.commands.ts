import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';

import { imageRepository } from '../image.repository';

const { SERVER_URL } = env;

/** Write side: register uploads (multer already stored the bytes) and delete files. */
export const imageCommands = {
  async uploadImage(filename: string): Promise<ServiceResponse<string | null>> {
    if (filename) {
      return new ServiceResponse<string>(
        ResponseStatus.Success,
        'Image uploaded successfully',
        `${SERVER_URL}/api/image/${filename}`,
        200
      );
    }
    return new ServiceResponse<string | null>(ResponseStatus.Failed, 'Error upload image', null, 500);
  },

  uploadMultipleFiles(filenames: string[]): ServiceResponse<{ filenames: string[] } | null> {
    if (filenames.length === 0) {
      return new ServiceResponse(ResponseStatus.Failed, 'No files uploaded', null, StatusCodes.BAD_REQUEST);
    }
    return new ServiceResponse(
      ResponseStatus.Success,
      `${filenames.length} files uploaded successfully`,
      { filenames },
      StatusCodes.OK
    );
  },

  async deleteFileByFileName(filename: string): Promise<ServiceResponse<any>> {
    const [findErr, files] = await to(imageRepository.findByFilename(filename));

    if (findErr || !files || files.length === 0) {
      return new ServiceResponse(ResponseStatus.Failed, 'File not found', null, 404);
    }

    const [deleteErr, result] = await to(imageRepository.deleteById(new mongoose.Types.ObjectId(files[0]._id)));

    if (deleteErr) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error deleting file', null, 500);
    }

    return new ServiceResponse(ResponseStatus.Success, 'File deleted successfully', result, 200);
  },
};
