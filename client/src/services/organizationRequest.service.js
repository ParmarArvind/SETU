import api from './api';

// -------------------------------------------------------------
// Search organizations
// -------------------------------------------------------------
export const searchOrganizations = async (query) => {
  const response = await api.get(
    '/organizations/search',
    {
      params: {
        q: query,
      },
    },
  );

  return response.data;
};

// -------------------------------------------------------------
// Request to join an organization
// -------------------------------------------------------------
export const requestToJoinOrganization = async (
  organizationId,
  {
    role = 'developer',
    expiresInDays = 7,
  } = {},
) => {
  const response = await api.post(
    `/organizations/${organizationId}/join-requests`,
    {
      role,
      expiresInDays,
    },
  );

  return response.data;
};

// -------------------------------------------------------------
// Get my organization invitations / join requests
// -------------------------------------------------------------
export const listMyOrganizationRequests =
  async () => {
    const response = await api.get(
      '/organization-requests/mine',
    );

    return response.data;
  };

// -------------------------------------------------------------
// Get requests for an organization
//
// Used by owner/admin to see pending join requests.
// -------------------------------------------------------------
export const listOrganizationRequests =
  async (organizationId) => {
    const response = await api.get(
      `/organizations/${organizationId}/requests`,
    );

    return response.data;
  };

// -------------------------------------------------------------
// Send organization invitation
//
// Used by owner/admin.
// -------------------------------------------------------------
export const sendOrganizationInvitation = async (
  organizationId,
  {
    email,
    role = 'developer',
    expiresInDays = 7,
  },
) => {
  const response = await api.post(
    `/organizations/${organizationId}/invitations`,
    {
      email,
      role,
      expiresInDays,
    },
  );

  return response.data;
};

// -------------------------------------------------------------
// Accept organization invitation / request
// -------------------------------------------------------------
export const acceptOrganizationRequest = async (
  requestId,
) => {
  const response = await api.patch(
    `/organization-requests/${requestId}/accept`,
  );

  return response.data;
};

// -------------------------------------------------------------
// Reject organization invitation / request
// -------------------------------------------------------------
export const rejectOrganizationRequest = async (
  requestId,
) => {
  const response = await api.patch(
    `/organization-requests/${requestId}/reject`,
  );

  return response.data;
};