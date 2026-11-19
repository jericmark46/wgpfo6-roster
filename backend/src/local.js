import app from './server.js';
import { closeDB } from './config/db.js';

const port = Number(process.env.PORT) || 5000;

const server = app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});

const shutdown = async () => {
  server.close(async () => {
    await closeDB();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
