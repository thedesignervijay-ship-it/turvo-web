import type { Pool } from 'pg';
import { config } from '../config.js';

export type QueryableRow = Record<string, unknown>;

export interface QueryResult<Row extends QueryableRow = QueryableRow> {
  rows: Row[];
  rowCount: number | null;
}

export interface DbClient {
  query<Row extends QueryableRow = QueryableRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<Row>>;
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
}

class PoolDbClient implements DbClient {
  constructor(private readonly pool: Pool) {}

  async query<Row extends QueryableRow = QueryableRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<Row>> {
    const result = await this.pool.query(text, params as never[]);
    return { rows: result.rows as Row[], rowCount: result.rowCount };
  }

  async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const tx: DbClient = {
        query: async <Row extends QueryableRow = QueryableRow>(
          text: string,
          params?: unknown[],
        ) => {
          const result = await client.query(text, params as never[]);
          return { rows: result.rows as Row[], rowCount: result.rowCount };
        },
        transaction: async (inner) => this.transaction(inner),
      };
      const value = await fn(tx);
      await client.query('COMMIT');
      return value;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export function createDbClient(pool: Pool): DbClient {
  return new PoolDbClient(pool);
}

export const poolConfig = {
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: { rejectUnauthorized: false },
} as const;
