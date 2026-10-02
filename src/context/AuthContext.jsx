import { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/authService";

/**
 * Authentication Context for managing application-wide auth state.
 */
const AuthContext = createContext(null);

/**
 * AuthProvider component that wraps the application and exposes authentication state.
 *
 * State:
 * - user: Sanitized user profile object { id, full_name, username, email, role, is_active } or null
 * - loading: boolean indicating whether initial session verification is in progress
 * - error: string or null containing any authentication error messages
 * - isAuthenticated: boolean derived helper (true if user is present and active)
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Bootstrap authentication check on initial application mount.
   * Calls GET /api/v1/auth/me via authService.getCurrentUser().
   */
  useEffect(() => {
    let isMounted = true;

    async function checkAuthSession() {
      try {
        const response = await authService.getCurrentUser();
        if (isMounted) {
          if (response && response.data) {
            setUser(response.data);
          } else {
            setUser(null);
          }
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          // If 401, the user is unauthenticated or session expired; treat as normal logged-out state
          setUser(null);
          if (err.status !== 401) {
            // Keep error details only for unexpected server/network failures
            setError(err.message || "Failed to verify session.");
          } else {
            setError(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuthSession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Log in with username/email and password.
   * On success, updates the React state with the returned user profile.
   *
   * @param {Object} credentials
   * @param {string} credentials.username
   * @param {string} credentials.password
   * @returns {Promise<Object>} The authenticated user profile
   */
  const login = async ({ username, password }) => {
    setError(null);
    try {
      const response = await authService.login({ username, password });
      const authenticatedUser = response.data;
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (err) {
      setError(err.message || "Login failed.");
      throw err;
    }
  };

  /**
   * Log out of the current session.
   * Destroys session on the backend and clears client React state.
   */
  const logout = async () => {
    setError(null);
    try {
      await authService.logout();
    } catch {
      // Even if network fails during logout, clear the client-side state
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user && user.is_active !== false),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to consume the AuthContext safely.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
