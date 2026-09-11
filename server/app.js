import express from 'express';

import cors from 'cors';

import helmet from 'helmet';

import env from './config/env.js';

import healthRoutes from './routes/health.routes.js';

import authRoutes from './routes/auth.routes.js';

import organizationRoutes from './routes/organization.routes.js';

import organizationRequestRoutes from './routes/organizationRequest.routes.js';

import projectRoutes from './routes/project.routes.js';

import taskRoutes from './routes/task.routes.js';

import commentRoutes from './routes/comment.routes.js';

import activityRoutes from './routes/activity.routes.js';

import notificationRoutes from './routes/notification.routes.js';

import attachmentRoutes from './routes/attachment.routes.js';

import notFound from './middleware/notFound.middleware.js';

import errorHandler from './middleware/error.middleware.js';

const app = express();

// ============================================================
// Security
// ============================================================

app.use(helmet());

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);

// ============================================================
// Body parser
// ============================================================

app.use(express.json());

// ============================================================
// Routes
// ============================================================

app.use(
  '/api/health',
  healthRoutes,
);

app.use(
  '/api/auth',
  authRoutes,
);

app.use(
  '/api/organizations',
  organizationRoutes,
);

// ------------------------------------------------------------
// Organization request routes
//
// PATCH /api/organization-requests/:id/accept
// PATCH /api/organization-requests/:id/reject
// ------------------------------------------------------------

app.use(
  '/api/organization-requests',
  organizationRequestRoutes,
);

app.use(
  '/api/projects',
  projectRoutes,
);

app.use(
  '/api/tasks',
  taskRoutes,
);

app.use(
  '/api',
  commentRoutes,
);

app.use(
  '/api',
  activityRoutes,
);

app.use(
  '/api/notifications',
  notificationRoutes,
);

app.use(
  '/api/tasks',
  attachmentRoutes,
);

// ============================================================
// 404 handler
// ============================================================

app.use(notFound);

// ============================================================
// Centralized error handler
// ============================================================

app.use(errorHandler);

export default app;