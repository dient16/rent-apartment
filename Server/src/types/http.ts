import type { NextFunction, Request as ExpressRequest, RequestHandler, Response } from 'express';
import type { ParamsFlatDictionary } from 'express-serve-static-core';

/**
 * Express 5 types `req.params` as `string | string[]` because a route can repeat
 * a parameter name. None of our routes do, so we narrow it back to plain strings.
 */
export type Request<ResBody = any, ReqBody = any, ReqQuery = any> = ExpressRequest<
  ParamsFlatDictionary,
  ResBody,
  ReqBody,
  ReqQuery
>;

export type { NextFunction, RequestHandler, Response };
