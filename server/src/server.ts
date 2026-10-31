import 'dotenv/config';
import './config/env.js';

import { createApp } from './app.js';
const app = createApp();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.info(
    `API listening on http://localhost:${PORT} (${process.env.NODE_ENV})`
  );
});

const shutdown = (): void => {
  console.info('Shutting down server...');

  server.close(() => {
    console.info('Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);