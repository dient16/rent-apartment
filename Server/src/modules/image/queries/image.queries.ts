import type { Readable } from 'node:stream';

import { default as to } from 'await-to-js';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { imageRepository } from '../image.repository';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export type ImageDownload = {
  stream: Readable;
  contentType: string;
  length: number;
  uploadDate: Date;
  etag: string;
};

/** Read side: stream and list stored images. */
export const imageQueries = {
  async openImageBrowser(filename: string): Promise<ServiceResponse<ImageDownload | null>> {
    const [err, files] = await to(imageRepository.findByFilename(filename, 1));

    if (err) {
      return new ServiceResponse<ImageDownload | null>(ResponseStatus.Failed, 'Error preview image', null, 500);
    }

    const file = files?.[0];
    if (!file) {
      return new ServiceResponse<ImageDownload | null>(ResponseStatus.Failed, 'No image exist', null, 404);
    }

    const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();

    return new ServiceResponse<ImageDownload>(
      ResponseStatus.Success,
      'Image retrieved successfully',
      {
        // Stream by _id: openDownloadStreamByName would repeat the lookup we just did.
        stream: await imageRepository.openDownloadStream(file._id),
        // Legacy uploads used GridFS `contentType`; newer ones store it in metadata.
        contentType:
          file.metadata?.contentType ??
          (file as { contentType?: string }).contentType ??
          CONTENT_TYPES[extension] ??
          'application/octet-stream',
        length: file.length,
        uploadDate: file.uploadDate,
        etag: `"${file._id.toString()}-${file.length}"`,
      },
      200
    );
  },

  async getRecentFile(): Promise<ServiceResponse<any | null>> {
    const [err, files] = await to(imageRepository.findMostRecent());

    if (err) {
      return new ServiceResponse<any>(ResponseStatus.Failed, 'Error fetching recent file', null, 500);
    }
    if (!files || files.length === 0) {
      return new ServiceResponse<any>(ResponseStatus.Failed, 'No files available', null, 404);
    }

    return new ServiceResponse<any>(ResponseStatus.Success, 'Recent file retrieved successfully', files[0], 200);
  },

  async getAllFiles(): Promise<ServiceResponse<any[]>> {
    const [err, files] = await to(imageRepository.findAll());

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
  },

  async getFileByFilename(filename: string): Promise<ServiceResponse<any | null>> {
    const [err, files] = await to(imageRepository.findByFilename(filename));

    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error fetching file', null, 500);
    }
    if (!files[0] || files.length === 0) {
      return new ServiceResponse(ResponseStatus.Failed, 'File not found', null, 404);
    }

    return new ServiceResponse(ResponseStatus.Success, 'File retrieved successfully', files[0], 200);
  },
};
