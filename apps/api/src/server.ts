import { buildApp } from './app.js';
import { config } from './config.js';
import { startScheduler } from './scheduler.js';

const start = async () => {
  const app = await buildApp();
  const stopScheduler = startScheduler();
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Czy Blog API listening on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    stopScheduler();
    process.exit(1);
  }
};

start();
