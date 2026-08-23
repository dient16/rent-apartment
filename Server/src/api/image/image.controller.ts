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

export const openImageBrowser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stream = await openImageBrowserService(req.params.filename);
    stream.data?.pipe(res);
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
