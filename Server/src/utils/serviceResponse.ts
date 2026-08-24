import type { Response } from 'express';
import { z } from 'zod';

export enum ResponseStatus {
  Success = 1,
  Failed = 0,
}

export class ServiceResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  statusCode: number;

  constructor(status: ResponseStatus, message: string, responseObject: T, statusCode: number) {
    this.success = status === ResponseStatus.Success;
    this.message = message;
    if (responseObject !== null && responseObject !== undefined) {
      this.data = responseObject;
    }
    this.statusCode = statusCode;
  }

  /**
   * Write this response to Express: HTTP status from `statusCode`, the object
   * itself as the JSON body. Controllers call `serviceResponse.send(res)`;
   * commands/queries just keep returning `ServiceResponse` as before.
   */
  send(res: Response) {
    return res.status(this.statusCode).send(this);
  }
}

export const ServiceResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema.optional(),
    statusCode: z.number(),
  });
