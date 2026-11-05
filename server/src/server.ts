import 'dotenv/config';
import './config/env.js';

import { createApp } from './app.js';
import { startCleanupJobs } from './jobs/cleanup.js';
import { closeSocket, initSocket } from './realtime/socket.js';
import { flushLogs, logError, startLogMaintenance } from './utils/logger.js';

const app = createApp();

const PORT = process.env.PORT || 3000;

let stopCleanup: () => void = () => undefined;
let stopLogMaintenance: () => void = () => undefined;

// Express creates the HTTP server (app.listen is http.createServer(app).listen under the hood).
const httpServer = app.listen(PORT, () => {
  console.info(
    `API listening on http://localhost:${PORT} (${process.env.NODE_ENV})`
  );
  stopCleanup = startCleanupJobs();
  stopLogMaintenance = startLogMaintenance();
});

// Socket.IO attaches to that same server, so REST and WebSocket share one port.
initSocket(httpServer);

const shutdown = (): void => {
  console.info('Shutting down server...');
  stopCleanup();
  stopLogMaintenance();

  void closeSocket().finally(() => {
    httpServer.close(() => {
      console.info('Server closed successfully');
      // Make sure the last error lines are on disk before exiting.
      void flushLogs().finally(() => process.exit(0));
    });
  });
};

// Errors that escape every handler: record them, then (for a crash) exit so the process
// manager restarts a clean instance.
process.on('unhandledRejection', (reason) => {
  logError('Unhandled promise rejection', reason);
});
process.on('uncaughtException', (error) => {
  logError('Uncaught exception', error);
  void flushLogs().finally(() => process.exit(1));
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
