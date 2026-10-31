import 'dotenv/config';
import './config/env.js';

import { createServer } from 'node:http';
import { createApp } from './app.js';
import { closeSocket, initSocket } from './realtime/socket.js';

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.info(
    `API listening on http://localhost:${PORT} (${process.env.NODE_ENV})`
  );
});

const shutdown = (): void => {
  console.info('Shutting down server...');

  void closeSocket().finally(() => {
    httpServer.close(() => {
      console.info('Server closed successfully');
      process.exit(0);
    });
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
