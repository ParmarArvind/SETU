import axios from 'axios';

const TOKEN_KEY = 'setu_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        TOKEN_KEY,
      );

    // --------------------------------------------------------
    // Attach JWT
    // --------------------------------------------------------

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    // --------------------------------------------------------
    // IMPORTANT:
    // File uploads use FormData.
    //
    // Do NOT manually set:
    // Content-Type: multipart/form-data
    //
    // The browser must generate the boundary automatically.
    // --------------------------------------------------------

    if (
      config.data instanceof FormData
    ) {
      if (config.headers) {
        delete config.headers[
          'Content-Type'
        ];

        delete config.headers[
          'content-type'
        ];
      }
    } else {
      // ------------------------------------------------------
      // Normal JSON API requests
      // ------------------------------------------------------

      config.headers =
        config.headers || {};

      config.headers[
        'Content-Type'
      ] = 'application/json';
    }

    return config;
  },

  (error) =>
    Promise.reject(error),
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(
  (response) =>
    response,

  (error) => {
    // --------------------------------------------------------
    // Invalid/expired JWT
    // --------------------------------------------------------

    if (
      error.response?.status === 401
    ) {
      localStorage.removeItem(
        TOKEN_KEY,
      );
    }

    return Promise.reject(
      error,
    );
  },
);

export default api;