import type { NextFunction, Request, Response } from '@/types/http';

import { handleServiceResponse } from '@/utils/httpHandlers';

import {
  deleteFileByFileNameService,
  getAllFilesService,
  getFileByFilenameService,
  getRecentFileService,
  openImageBrowserService,
  uploadImageService,
} from './image.service';

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await uploadImageService(req.file?.filename as string);
    handleServiceResponse(response, res);
  } catch (error) {
    next(error);
  }
};

// Uploaded filenames are random hex, so a given URL always maps to the same bytes —
// they can be cached forever by the browser and any proxy in front of the API.
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

export const openImageBrowser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await openImageBrowserService(req.params.filename);

    if (!response.data) {
      // Previously this fell through without writing anything and the request hung.
      return handleServiceResponse(response, res);
    }

    const { stream, contentType, length, uploadDate, etag } = response.data;

    res.setHeader('Cache-Control', IMMUTABLE_CACHE);
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', uploadDate.toUTCString());
    // Also stops the compression middleware from trying to gzip already-compressed bytes.
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', length);

    if (req.headers['if-none-match'] === etag) {
      stream.destroy();
      return res.status(304).end();
    }

    stream.on('error', next);
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const uploadMultipleFiles = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.files || !Array.isArray(req.files)) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const files = req.files as Express.Multer.File[];

    const filenames = files.map((file) => file.filename);

    res.status(200).json({
      success: true,
      message: `${filenames.length} files uploaded successfully`,
      data: {
        filenames: filenames,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = await getRecentFileService();
    res.status(200).json({
      success: true,
      data: { file },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = await getAllFilesService();
    res.status(200).json({
      success: true,
      files,
    });
  } catch (error) {
    next(error);
  }
};

export const getFileByFilename = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = await getFileByFilenameService(req.params.filename);
    res.status(200).json({
      success: true,
      file,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFileByFileName = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteFileByFileNameService(req.params.id);
    res.status(200).json({
      success: true,
      message: `File with ID ${req.params.id} is deleted`,
    });
  } catch (error) {
    next(error);
  }
};
