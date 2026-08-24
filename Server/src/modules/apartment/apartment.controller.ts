import type { NextFunction, Request, Response } from '@/types/http';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { handleServiceResponse } from '@/utils/httpHandlers';

import type { GetOwnerApartmentsQuery, SearchRoomType } from './apartment.dto';
import { apartmentCommands } from './commands/apartment.commands';
import { apartmentQueries } from './queries/apartment.queries';
import { apartmentSearchQueries } from './queries/apartment-search.queries';

export const getAllApartment = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceResponse = await apartmentQueries.getAllApartments();
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
export const getUserApartments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceResponse = await apartmentQueries.getUserApartments((req.user as UserDecode)._id);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
export const getPopularRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const serviceResponse = await apartmentQueries.getPopularRooms(limit);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
export const getApartmentDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apartmentId } = req.params;

    const serviceResponse = await apartmentQueries.getApartmentDetail(apartmentId, req.query as any);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const createApartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;

    const serviceResponse = await apartmentCommands.createApartment(userId, req.body);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
export const searchApartments = async (req: SearchRoomType & Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (new Date(startDate) < today || new Date(endDate) < today) {
      return handleServiceResponse(
        new ServiceResponse<null>(
          ResponseStatus.Failed,
          "The start date and end date must be on or after today's date",
          null,
          StatusCodes.BAD_REQUEST
        ),
        res
      );
    }

    const serviceResponse = await apartmentSearchQueries.searchApartments(req.query);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const updateApartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apartmentId } = req.params;
    const { _id: updatedBy } = req.user as UserDecode;
    const serviceResponse = await apartmentCommands.updateApartment(apartmentId, req.body, updatedBy);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const deleteApartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apartmentId } = req.params;
    const { _id: deletedBy } = req.user as UserDecode;
    const serviceResponse = await apartmentCommands.deleteApartment(apartmentId, deletedBy);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const removeRoomFromApartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apartmentId, roomId } = req.params;
    const { _id: removedBy } = req.user as UserDecode;
    const serviceResponse = await apartmentCommands.removeRoomFromApartment(apartmentId, roomId, removedBy);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getRoomsCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // A single `roomIds[]=x` arrives as a string, not a one-element array.
    const toArray = (value: unknown): string[] =>
      value === undefined ? [] : Array.isArray(value) ? (value as string[]) : [String(value)];

    const roomIds = toArray(req.query.roomIds);
    const roomNumbers = toArray(req.query.roomNumbers);

    const badRequest = (message: string) =>
      handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, message, null, StatusCodes.BAD_REQUEST), res);

    if (!roomIds.length) {
      return badRequest('roomIds is required.');
    }

    if (roomIds.length !== roomNumbers.length) {
      return badRequest('Mismatch between roomIds and roomNumbers length.');
    }

    const { roomIds: _roomIds, roomNumbers: _roomNumbers, ...query } = req.query;

    const serviceResponse = await apartmentQueries.getRoomsCheckout(roomIds, roomNumbers, query);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getApartmentsByUserId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const serviceResponse = await apartmentQueries.getApartmentsByUserId(
      userId,
      req.query as unknown as GetOwnerApartmentsQuery
    );
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
