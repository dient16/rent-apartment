import type { NextFunction, Request, Response } from 'express';
import { bookingService } from './booking.service';
import { handleServiceResponse } from '@/utils/httpHandlers';

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceResponse = await bookingService.createBooking(req.body);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user;
    const serviceResponse = await bookingService.getBookings(userId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const serviceResponse = await bookingService.getBooking(bookingId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user;
    const serviceResponse = await bookingService.getUserBookings(userId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
export const confirmBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const serviceResponse = await bookingService.confirmBooking(bookingId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
