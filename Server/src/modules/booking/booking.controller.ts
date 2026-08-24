import type { NextFunction, Request, Response } from '@/types/http';
import type { BookingListQuery } from './booking.dto';
import { bookingCommands } from './commands/booking.commands';
import { bookingQueries } from './queries/booking.queries';
import { handleServiceResponse } from '@/utils/httpHandlers';

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Optional: set by `optionalAccessToken` when the guest is signed in.
    const userId = (req.user as UserDecode | undefined)?._id;
    const serviceResponse = await bookingCommands.createBooking(req.body, userId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const serviceResponse = await bookingQueries.getBookings(userId, req.query as unknown as BookingListQuery);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const serviceResponse = await bookingQueries.getBooking(bookingId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const serviceResponse = await bookingQueries.getUserBookings(userId, req.query as unknown as BookingListQuery);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
export const confirmBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const serviceResponse = await bookingCommands.confirmBooking(bookingId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const { _id: userId } = req.user as UserDecode;
    const serviceResponse = await bookingCommands.cancelBooking(bookingId, userId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
