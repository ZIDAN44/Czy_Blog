import { buildApp } from './app.js';
import { config } from './config.js';
import { migrate } from './migrate.js';
import { startScheduler, startMediaCleanup } from './scheduler.js';

const start = async () => {
  await migrate();
  const app = await buildApp();
  const stopScheduler = startScheduler(app.log);
  const stopMediaCleanup = startMediaCleanup(app.log);
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    stopScheduler();
    stopMediaCleanup();
    process.exit(1);
  }
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
