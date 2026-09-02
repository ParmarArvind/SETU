import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import env from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import notFound from './middleware/notFound.middleware.js';
import errorHandler from './middleware/error.middleware.js';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);

app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);



// 404 handler
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

export default app;