import { createContext, useContext, useState, useEffect } from 'react';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} from '../services/auth.service';

const AuthContext = createContext(null);

const TOKEN_KEY = 'setu_token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check for an existing session

  // ------------------------------------------------------------
  // On first app load, check localStorage for a saved token and
  // try to restore the session by asking the backend who this is.
  // ------------------------------------------------------------
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result = await getCurrentUser();
        setUser(result.data.user);
      } catch (error) {
        // Token is invalid/expired — clear it so we don't keep retrying
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ------------------------------------------------------------
  // login: calls the API, stores token, updates user state
  // ------------------------------------------------------------
  const login = async ({ email, password }) => {
    const result = await loginUser({ email, password });
    localStorage.setItem(TOKEN_KEY, result.data.token);
    setUser(result.data.user);
    return result.data.user;
  };

  // ------------------------------------------------------------
  // register: calls the API, stores token, updates user state
  // (we auto-login on successful registration, matching our
  // backend which already returns a token on register)
  // ------------------------------------------------------------
  const register = async ({ name, email, password }) => {
    const result = await registerUser({ name, email, password });
    localStorage.setItem(TOKEN_KEY, result.data.token);
    setUser(result.data.user);
    return result.data.user;
  };

  // ------------------------------------------------------------
  // logout: calls the API (best-effort), clears local state
  // regardless of whether the API call succeeds
  // ------------------------------------------------------------
  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      if (token) {
        await logoutUser();
      }
    } catch (error) {
      // Even if the server call fails (e.g. token already expired),
      // we still want to clear local state below — logout should
      // always succeed from the user's perspective.
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --------------------------------------------------------------
// useAuth: the hook components will actually use
// --------------------------------------------------------------
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};