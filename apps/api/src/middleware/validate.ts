import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { validationError } from '../lib/errors.js';

type Schema = ZodType;

function failWithZod(next: NextFunction, error: ZodError): void {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  next(validationError('Validation failed.', details));
}

function storeParsed(
  req: Request,
  key: 'body' | 'query' | 'params',
  parsed: unknown,
  next: NextFunction,
): void {
  req.validated = { ...req.validated, [key]: parsed };
  next();
}

/**
 * Zod request validation middleware. Parsed values are stored on
 * `req.validated` rather than mutating `req.body`/`req.query`, which are
 * read-only (getter-only) in Express 5.
 */
export const validate = {
  body: (schema: Schema): RequestHandler => {
    return (req: Request, _res: Response, next: NextFunction) => {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        failWithZod(next, result.error);
        return;
      }
      storeParsed(req, 'body', result.data, next);
    };
  },
  query: (schema: Schema): RequestHandler => {
    return (req: Request, _res: Response, next: NextFunction) => {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        failWithZod(next, result.error);
        return;
      }
      storeParsed(req, 'query', result.data, next);
    };
  },
  params: (schema: Schema): RequestHandler => {
    return (req: Request, _res: Response, next: NextFunction) => {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        failWithZod(next, result.error);
        return;
      }
      storeParsed(req, 'params', result.data, next);
    };
  },
};
