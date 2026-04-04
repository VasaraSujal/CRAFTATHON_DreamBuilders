import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  loginUser,
  registerUser,
  loginUserMfa,
  refreshSession as refreshSessionApi,
  logoutSession as logoutSessionApi,
  setAuthToken,
} from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'secure-comm-user';
const storedUser = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

if (storedUser?.token) {
  setAuthToken(storedUser.token);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return storedUser;
  });
  const [mfaChallenge, setMfaChallenge] = useState(null);

  const finalizeSession = (data) => {
    setAuthToken(data.token);
    setUser(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  useEffect(() => {
    setAuthToken(user?.token);
  }, [user]);

  useEffect(() => {
    const reviveSession = async () => {
      try {
        const refreshed = await refreshSessionApi();
        finalizeSession(refreshed);
      } catch {
        // Keep existing session if refresh cookies are unavailable; the interceptor will still retry requests.
      }
    };

    reviveSession();
  }, []);

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    if (data?.mfaRequired) {
      setMfaChallenge({ mfaToken: data.mfaToken, email });
      return data;
    }

    setAuthToken(data.token);
    setUser(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  };

  const completeMfaLogin = async (code) => {
    if (!mfaChallenge?.mfaToken) {
      throw new Error('No MFA challenge is active');
    }

    const data = await loginUserMfa({ mfaToken: mfaChallenge.mfaToken, code });
    finalizeSession(data);
    setMfaChallenge(null);
    return data;
  };

  const refreshSession = async () => {
    const data = await refreshSessionApi();
    finalizeSession(data);
    return data;
  };

  const register = async (payload) => {
    const data = await registerUser(payload);
    if (data?.token) {
      finalizeSession(data);
    }
    return data;
  };

  const logout = async () => {
    try {
      await logoutSessionApi();
    } catch {
      // ignore logout network issues
    }
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setMfaChallenge(null);
  };

  const value = useMemo(
    () => ({ user, login, register, logout, completeMfaLogin, refreshSession, mfaChallenge }),
    [user, mfaChallenge]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
