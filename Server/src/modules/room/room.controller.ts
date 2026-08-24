import type { NextFunction, Request, Response } from '@/types/http';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { roomCommands } from './commands/room.commands';
import { roomQueries } from './queries/room.queries';

export const addRoomToApartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apartmentId } = req.params;
    const room = req.body;

    const serviceResponse = await roomCommands.addRoomToApartment(apartmentId, room);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const findRoomById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;

    const serviceResponse = await roomQueries.findRoomById(roomId);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;
    const roomData = req.body;

    const serviceResponse = await roomCommands.updateRoom(roomId, roomData);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;

    const serviceResponse = await roomCommands.deleteRoom(roomId);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
export const getRoomsByApartmentId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apartmentId } = req.params;
    const serviceResponse = await roomQueries.getRoomsByApartmentId(apartmentId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
