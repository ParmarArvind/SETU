import request from 'supertest';

// --------------------------------------------------------------
// registerUser(app, overrides)
//
// Registers a real user through the actual /api/auth/register
// endpoint (not a DB shortcut) so tests exercise the same code
// path production traffic does. Returns the auth token + user.
// --------------------------------------------------------------
const registerUser = async (app, overrides = {}) => {
  const payload = {
    name: 'Test User',
    email: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: 'password123',
    ...overrides,
  };

  const response = await request(app).post('/api/auth/register').send(payload);

  if (response.status !== 201) {
    throw new Error(`registerUser failed: ${JSON.stringify(response.body)}`);
  }

  return {
    token: response.body.data.token,
    user: response.body.data.user,
  };
};

// --------------------------------------------------------------
// createOrganization(app, token, overrides)
//
// Creates an organization as the given (already-registered) user
// via the real POST /api/organizations endpoint.
// --------------------------------------------------------------
const createOrganization = async (app, token, overrides = {}) => {
  const payload = {
    name: `Org ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...overrides,
  };

  const response = await request(app)
    .post('/api/organizations')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  if (response.status !== 201) {
    throw new Error(`createOrganization failed: ${JSON.stringify(response.body)}`);
  }

  return {
    organization: response.body.data.organization,
    membership: response.body.data.membership,
  };
};

// --------------------------------------------------------------
// addOrgMember(app, ownerToken, orgId, email, role)
//
// Adds an already-registered user to an organization via the real
// POST /api/organizations/:id/members endpoint. Requires the acting
// token to have members:invite (owner/admin).
// --------------------------------------------------------------
const addOrgMember = async (app, ownerToken, orgId, email, role = 'developer') => {
  const response = await request(app)
    .post(`/api/organizations/${orgId}/members`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ email, role });

  if (response.status !== 201) {
    throw new Error(`addOrgMember failed: ${JSON.stringify(response.body)}`);
  }

  return { membership: response.body.data.membership };
};

// --------------------------------------------------------------
// createProject(app, token, orgId, overrides)
//
// Creates a project inside an organization via the real
// POST /api/organizations/:id/projects endpoint.
// --------------------------------------------------------------
const createProject = async (app, token, orgId, overrides = {}) => {
  const payload = {
    name: `Project ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...overrides,
  };

  const response = await request(app)
    .post(`/api/organizations/${orgId}/projects`)
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  if (response.status !== 201) {
    throw new Error(`createProject failed: ${JSON.stringify(response.body)}`);
  }

  return {
    project: response.body.data.project,
    membership: response.body.data.membership,
  };
};

// --------------------------------------------------------------
// addProjectMember(app, actingToken, projectId, userId)
//
// Adds an existing org member to a project via the real
// POST /api/projects/:projectId/members endpoint.
// --------------------------------------------------------------
const addProjectMember = async (app, actingToken, projectId, userId) => {
  const response = await request(app)
    .post(`/api/projects/${projectId}/members`)
    .set('Authorization', `Bearer ${actingToken}`)
    .send({ userId });

  if (response.status !== 201) {
    throw new Error(`addProjectMember failed: ${JSON.stringify(response.body)}`);
  }

  return { membership: response.body.data.membership };
};

// --------------------------------------------------------------
// createTask(app, token, projectId, overrides)
//
// Creates a task inside a project via the real
// POST /api/projects/:projectId/tasks endpoint.
// --------------------------------------------------------------
const createTask = async (app, token, projectId, overrides = {}) => {
  const payload = {
    title: `Task ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...overrides,
  };

  const response = await request(app)
    .post(`/api/projects/${projectId}/tasks`)
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  if (response.status !== 201) {
    throw new Error(`createTask failed: ${JSON.stringify(response.body)}`);
  }

  return { task: response.body.data.task };
};

export {
  registerUser,
  createOrganization,
  addOrgMember,
  createProject,
  addProjectMember,
  createTask,
};