import type { NextFunction, Request, Response } from '@/types/http';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { imageCommands } from './commands/image.commands';
import { imageQueries } from './queries/image.queries';

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await imageCommands.uploadImage(req.file?.filename as string);
    handleServiceResponse(response, res);
  } catch (error) {
    next(error);
  }
};

// Filenames are random hex, so a URL always maps to the same bytes — cache forever.
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

export const openImageBrowser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await imageQueries.openImageBrowser(req.params.filename);

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
    const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
    handleServiceResponse(imageCommands.uploadMultipleFiles(files.map((file) => file.filename)), res);
  } catch (error) {
    next(error);
  }
};

export const getRecentFile = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceResponse = await imageQueries.getRecentFile();
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getAllFiles = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceResponse = await imageQueries.getAllFiles();
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getFileByFilename = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceResponse = await imageQueries.getFileByFilename(req.params.filename);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const deleteFileByFileName = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceResponse = await imageCommands.deleteFileByFileName(req.params.id);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
