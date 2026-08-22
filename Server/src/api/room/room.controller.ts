import type { NextFunction, Request, Response } from 'express';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { roomService } from './room.service';

export const addRoomToApartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apartmentId } = req.params;
    const room = req.body;
    const files = req.files as Express.Multer.File[];

    const serviceResponse = await roomService.addRoomToApartment(apartmentId, room, files);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const findRoomById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;

    const serviceResponse = await roomService.findRoomById(roomId);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;
    const roomData = req.body;

    const serviceResponse = await roomService.updateRoom(roomId, roomData);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;

    const serviceResponse = await roomService.deleteRoom(roomId);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
export const getRoomsByApartmentId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apartmentId } = req.params;
    const serviceResponse = await roomService.getRoomsByApartmentId(apartmentId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
