import api from './api';

// --------------------------------------------------------------
// listOrganizations: GET /api/organizations
// Returns every org the current user belongs to, with their role.
// --------------------------------------------------------------
export const listOrganizations = async () => {
  const response = await api.get('/organizations');
  return response.data;
};

// --------------------------------------------------------------
// createOrganization: POST /api/organizations
// --------------------------------------------------------------
export const createOrganization = async ({ name, description }) => {
  const response = await api.post('/organizations', { name, description });
  return response.data;
};

// --------------------------------------------------------------
// getOrganization: GET /api/organizations/:id
// --------------------------------------------------------------
export const getOrganization = async (organizationId) => {
  const response = await api.get(`/organizations/${organizationId}`);
  return response.data;
};

// --------------------------------------------------------------
// updateOrganization: PATCH /api/organizations/:id
// --------------------------------------------------------------
export const updateOrganization = async (organizationId, { name, description }) => {
  const response = await api.patch(`/organizations/${organizationId}`, {
    name,
    description,
  });
  return response.data;
};

// --------------------------------------------------------------
// listMembers: GET /api/organizations/:id/members
// --------------------------------------------------------------
export const listMembers = async (organizationId) => {
  const response = await api.get(`/organizations/${organizationId}/members`);
  return response.data;
};

// --------------------------------------------------------------
// addMember: POST /api/organizations/:id/members
// --------------------------------------------------------------
export const addMember = async (organizationId, { email, role }) => {
  const response = await api.post(`/organizations/${organizationId}/members`, {
    email,
    role,
  });
  return response.data;
};

// --------------------------------------------------------------
// removeMember: DELETE /api/organizations/:id/members/:memberId
// --------------------------------------------------------------
export const removeMember = async (organizationId, memberId) => {
  const response = await api.delete(
    `/organizations/${organizationId}/members/${memberId}`,
  );
  return response.data;
};

// --------------------------------------------------------------
// assignRole: PATCH /api/organizations/:id/members/:memberId/role
// --------------------------------------------------------------
export const assignRole = async (organizationId, memberId, role) => {
  const response = await api.patch(
    `/organizations/${organizationId}/members/${memberId}/role`,
    { role },
  );
  return response.data;
};