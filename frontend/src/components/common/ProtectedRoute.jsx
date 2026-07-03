import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!activeRole) {
    return <Navigate to="/select-role" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(activeRole)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return children;
}
