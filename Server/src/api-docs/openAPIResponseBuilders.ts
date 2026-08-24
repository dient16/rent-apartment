import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { ServiceResponseSchema } from '@/utils/serviceResponse';

extendZodWithOpenApi(z);

type ResponseMap = Record<number, { description: string; content?: Record<string, { schema: z.ZodTypeAny }> }>;

/** A single success response wrapped in the standard `ServiceResponse` envelope. */
export function createApiResponse(schema: z.ZodTypeAny, description: string, statusCode = StatusCodes.OK): ResponseMap {
  return {
    [statusCode]: {
      description,
      content: {
        'application/json': {
          schema: ServiceResponseSchema(schema),
        },
      },
    },
  };
}

/** Error envelope: same shape as `ServiceResponse` but `data` is always absent. */
export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    message: z.string(),
    statusCode: z.number().int(),
  })
  .openapi('ErrorResponse');

const DEFAULT_ERROR_DESCRIPTIONS: Record<number, string> = {
  [StatusCodes.BAD_REQUEST]: 'Invalid input',
  [StatusCodes.UNAUTHORIZED]: 'Missing, invalid or expired access token',
  [StatusCodes.FORBIDDEN]: 'Not allowed to perform this action',
  [StatusCodes.NOT_FOUND]: 'Resource not found',
  [StatusCodes.CONFLICT]: 'Conflict with the current state of the resource',
  [StatusCodes.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [StatusCodes.INTERNAL_SERVER_ERROR]: 'Unexpected server error',
};

/** Error responses for the given status codes, e.g. `errorResponses(401, 404)`. */
export function errorResponses(...statusCodes: number[]): ResponseMap {
  return Object.fromEntries(
    statusCodes.map((statusCode) => [
      statusCode,
      {
        description: DEFAULT_ERROR_DESCRIPTIONS[statusCode] ?? 'Error',
        content: { 'application/json': { schema: ErrorResponseSchema } },
      },
    ])
  );
}

/**
 * Success response + error responses in one call.
 * 500 is always included; 401 is added when `auth: true`.
 */
export function createApiResponses(
  schema: z.ZodTypeAny,
  description: string,
  options: { status?: number; auth?: boolean; errors?: number[] } = {}
): ResponseMap {
  const { status = StatusCodes.OK, auth = false, errors = [] } = options;
  const codes = new Set<number>(errors);
  if (auth) codes.add(StatusCodes.UNAUTHORIZED);
  codes.add(StatusCodes.INTERNAL_SERVER_ERROR);
  return {
    ...createApiResponse(schema, description, status),
    ...errorResponses(...[...codes].sort((a, b) => a - b)),
  };
}

/** `{ page, limit, total, totalPages }` used by every paginated list endpoint. */
export const PaginationSchema = z
  .object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(1),
  })
  .openapi('Pagination');

/** Mongo ObjectId path / query / body parameter. */
export const objectId = (description: string) =>
  z
    .string()
    .regex(/^[a-fA-F\d]{24}$/)
    .openapi({ description, example: '66b1f2c9e4b0a1d2c3e4f5a6' });

/** Marks a route as public (overrides the global BearerAuth requirement). */
export const PUBLIC: { [name: string]: string[] }[] = [];

/** Marks a route as requiring a Bearer access token (explicit, matches the global default). */
export const BEARER: { [name: string]: string[] }[] = [{ BearerAuth: [] }];
