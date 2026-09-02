import app from './app.js';
import env from './config/env.js';
import connectDB from './config/database.js';

async function startServer() {
  await connectDB();

  app.listen(env.port, () => {
    console.log(`DevSync API running on port ${env.port}`);
    console.log(`Environment: ${env.nodeEnv}`);
  });
}

startServer();