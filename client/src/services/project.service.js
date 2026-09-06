import api from './api';

// --------------------------------------------------------------
// listProjects: GET /api/organizations/:id/projects
// status: 'active' (default) | 'archived' | 'all'
// --------------------------------------------------------------
export const listProjects = async (organizationId, status = 'active') => {
  const response = await api.get(`/organizations/${organizationId}/projects`, {
    params: { status },
  });
  return response.data;
};

// --------------------------------------------------------------
// createProject: POST /api/organizations/:id/projects
// --------------------------------------------------------------
export const createProject = async (organizationId, { name, description, startDate, endDate }) => {
  const response = await api.post(`/organizations/${organizationId}/projects`, {
    name,
    description,
    startDate,
    endDate,
  });
  return response.data;
};

// --------------------------------------------------------------
// getProject: GET /api/projects/:projectId
// --------------------------------------------------------------
export const getProject = async (projectId) => {
  const response = await api.get(`/projects/${projectId}`);
  return response.data;
};

// --------------------------------------------------------------
// updateProject: PATCH /api/projects/:projectId
// --------------------------------------------------------------
export const updateProject = async (projectId, { name, description, startDate, endDate }) => {
  const response = await api.patch(`/projects/${projectId}`, {
    name,
    description,
    startDate,
    endDate,
  });
  return response.data;
};

// --------------------------------------------------------------
// archiveProject: PATCH /api/projects/:projectId/archive
// --------------------------------------------------------------
export const archiveProject = async (projectId) => {
  const response = await api.patch(`/projects/${projectId}/archive`);
  return response.data;
};

// --------------------------------------------------------------
// unarchiveProject: PATCH /api/projects/:projectId/unarchive
// --------------------------------------------------------------
export const unarchiveProject = async (projectId) => {
  const response = await api.patch(`/projects/${projectId}/unarchive`);
  return response.data;
};

// --------------------------------------------------------------
// getProjectDashboard: GET /api/projects/:projectId/dashboard
// --------------------------------------------------------------
export const getProjectDashboard = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/dashboard`);
  return response.data;
};

// --------------------------------------------------------------
// listProjectMembers: GET /api/projects/:projectId/members
// --------------------------------------------------------------
export const listProjectMembers = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/members`);
  return response.data;
};

// --------------------------------------------------------------
// addProjectMember: POST /api/projects/:projectId/members
// Takes a userId (an existing org member) — not an email.
// --------------------------------------------------------------
export const addProjectMember = async (projectId, userId) => {
  const response = await api.post(`/projects/${projectId}/members`, { userId });
  return response.data;
};

// --------------------------------------------------------------
// removeProjectMember: DELETE /api/projects/:projectId/members/:memberId
// --------------------------------------------------------------
export const removeProjectMember = async (projectId, memberId) => {
  const response = await api.delete(`/projects/${projectId}/members/${memberId}`);
  return response.data;
};