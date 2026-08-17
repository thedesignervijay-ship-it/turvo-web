import { Pool } from 'pg';
import { config } from './config.js';
import { createApp } from './app.js';
import { createContainer } from './container.js';
import { createDbClient, poolConfig } from './db/client.js';

const pool = new Pool(poolConfig);
const db = createDbClient(pool);
const container = createContainer(db);
const app = createApp(container);

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.info(`Turvo API listening on http://localhost:${config.port} (${config.nodeEnv})`);
});

async function shutdown(signal: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.info(`[${signal}] Shutting down...`);
  server.close(async () => {
    try {
      await pool.end();
    } finally {
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
