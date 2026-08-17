import type { AuthContext } from './index.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by the authenticate middleware. */
      auth?: AuthContext;
      /** Parsed/validated request data (body, query, params). */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: Record<string, string>;
      };
    }
  }
}

export {};
