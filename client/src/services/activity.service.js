import api from './api';

export const getProjectActivity = async ({
  projectId,
  page = 1,
  limit = 20,
  action = '',
} = {}) => {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const params = {
    page,
    limit,
  };

  if (action) {
    params.action = action;
  }

  const response = await api.get(
    `/projects/${projectId}/activity`,
    {
      params,
    },
  );

  return response.data;
};