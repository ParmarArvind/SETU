import http from 'http';

import app from './app.js';
import env from './config/env.js';
import connectDB from './config/database.js';

import initializeSocket from './socket/socket.js';

// ============================================================
// Create HTTP server
//
// Socket.IO attaches to this HTTP server.
// Express app continues to handle normal REST API requests.
// ============================================================

const httpServer = http.createServer(app);

// ============================================================
// Start server
// ============================================================

async function startServer() {
  try {
    // ----------------------------------------------------------
    // Connect MongoDB
    // ----------------------------------------------------------

    await connectDB();

    // ----------------------------------------------------------
    // Initialize Socket.IO
    //
    // initializeSocket returns the Socket.IO instance.
    // We store it inside the Express app so controllers can
    // access it using:
    //
    // const io = req.app.get('io');
    // ----------------------------------------------------------

    const io = initializeSocket(
      httpServer,
      env,
    );

    app.set(
      'io',
      io,
    );

    // ----------------------------------------------------------
    // Start HTTP + Socket.IO server
    // ----------------------------------------------------------

    httpServer.listen(
      env.port,
      () => {
        console.log(
          `SETU API running on port ${env.port}`,
        );

        console.log(
          `Environment: ${env.nodeEnv}`,
        );

        console.log(
          'Socket.IO ready',
        );
      },
    );
  } catch (error) {
    console.error(
      'Failed to start SETU server:',
      error,
    );

    process.exit(1);
  }
}

// ============================================================
// Start application
// ============================================================

startServer();