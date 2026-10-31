import 'dotenv/config';
import './config/env.js'; // validate env vars at startup — exits if invalid
import http from 'node:http';
import { createApp } from './app.js';

const env = process.env;
const app = createApp();
const server = http.createServer(app);

server.listen(env.PORT, () => {
  console.info(`API listening on http://localhost:${String(env.PORT)} (${String(env.NODE_ENV)})`);
});

const shutdown = (): void => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
