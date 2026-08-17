import type { Request, RequestHandler, Response } from 'express';

/** 404 handler for unmatched routes (spec section 30: error envelope). */
export const notFoundHandler: RequestHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
  });
};
