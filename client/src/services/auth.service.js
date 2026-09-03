import api from './api';

// --------------------------------------------------------------
// registerUser: POST /api/auth/register
// --------------------------------------------------------------
export const registerUser = async ({ name, email, password }) => {
  const response = await api.post('/auth/register', {
    name,
    email,
    password,
  });

  return response.data;
};

// --------------------------------------------------------------
// loginUser: POST /api/auth/login
// --------------------------------------------------------------
export const loginUser = async ({ email, password }) => {
  const response = await api.post('/auth/login', {
    email,
    password,
  });

  return response.data;
};

// --------------------------------------------------------------
// getCurrentUser: GET /api/auth/me
//
// JWT is automatically attached by the Axios request interceptor.
// No token needs to be passed manually.
// --------------------------------------------------------------
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');

  return response.data;
};

// --------------------------------------------------------------
// logoutUser: POST /api/auth/logout
//
// JWT is automatically attached by the Axios request interceptor.
// --------------------------------------------------------------
export const logoutUser = async () => {
  const response = await api.post('/auth/logout');

  return response.data;
};