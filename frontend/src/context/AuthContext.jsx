import React, { createContext, useState, useContext, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [activeRole, setActiveRole] = useState(null);
  const [scopes, setScopes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.getCurrentUser();
      setUser(data.user);
      setRoles(data.user.roles || []);
      setScopes(data.scopes || {});

      const savedRole = localStorage.getItem('active_role');
      if (savedRole && data.user.roles.find(r => r.role_name === savedRole)) {
        setActiveRole(savedRole);
      } else if (data.user.roles.length === 1) {
        const roleName = data.user.roles[0].role_name;
        setActiveRole(roleName);
        localStorage.setItem('active_role', roleName);
      }

      setLoading(false);
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('access_token');
      localStorage.removeItem('active_role');
      setLoading(false);
    }
  }

  async function login(email, password) {
    console.warn('Password-based login is deprecated. Use OTP authentication instead.');
    try {
      setError(null);
      const data = await authApi.login(email, password);

      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);

      setUser(data.user);
      setRoles(data.user.roles || []);

      if (data.user.roles.length === 1) {
        const roleName = data.user.roles[0].role_name;
        setActiveRole(roleName);
        localStorage.setItem('active_role', roleName);
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('active_role');
    setUser(null);
    setRoles([]);
    setActiveRole(null);
    setScopes({});
  }

  function selectRole(roleName) {
    if (roles.find(r => r.role_name === roleName)) {
      setActiveRole(roleName);
      localStorage.setItem('active_role', roleName);
    }
  }

  function setUserData(userData) {
    setUser(userData.user);
    setRoles(userData.user.roles || []);
    setScopes(userData.scopes || {});

    if (userData.user.roles.length === 1) {
      const roleName = userData.user.roles[0].role_name;
      setActiveRole(roleName);
      localStorage.setItem('active_role', roleName);
    }

    setLoading(false);
  }

  const value = {
    user,
    roles,
    activeRole,
    scopes,
    loading,
    error,
    checkAuth,
    login,
    logout,
    selectRole,
    setUserData,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
