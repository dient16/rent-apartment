import type { ZodNumber, ZodOptional } from 'zod';
import z from 'zod';

/** Wrap a schema with preprocess: parse strings (query/params) before validating. */
export function preprocessString<Schema extends z.ZodTypeAny>(schema: Schema, parseFunction: (value: string) => any) {
  return z.preprocess((value) => {
    if (typeof value === 'string') {
      try {
        return parseFunction(value);
      } catch {
        return undefined;
      }
    }

    return value;
  }, schema);
}

export const stringToNumber = (schema: ZodNumber | ZodOptional<z.ZodNumber>) =>
  preprocessString(schema, (value) => Number.parseInt(value, 10));

export const stringToFloat = (schema: ZodNumber | ZodOptional<z.ZodNumber>) =>
  preprocessString(schema, (value) => Number.parseFloat(value));

export const stringToDate = (schema: z.ZodTypeAny) => preprocessString(schema, (value) => new Date(value));

export const parseJson = (schema: z.ZodTypeAny) => preprocessString(schema, (value) => JSON.parse(value));
