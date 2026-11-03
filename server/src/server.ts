import 'dotenv/config';
import './config/env.js';

import { createApp } from './app.js';
import { startCleanupJobs } from './jobs/cleanup.js';
import { closeSocket, initSocket } from './realtime/socket.js';

const app = createApp();

const PORT = process.env.PORT || 3000;

let stopCleanup: () => void = () => undefined;

// Express creates the HTTP server (app.listen is http.createServer(app).listen under the hood).
const httpServer = app.listen(PORT, () => {
  console.info(
    `API listening on http://localhost:${PORT} (${process.env.NODE_ENV})`
  );
  stopCleanup = startCleanupJobs();
});

// Socket.IO attaches to that same server, so REST and WebSocket share one port.
initSocket(httpServer);

const shutdown = (): void => {
  console.info('Shutting down server...');
  stopCleanup();

  void closeSocket().finally(() => {
    httpServer.close(() => {
      console.info('Server closed successfully');
      process.exit(0);
    });
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
