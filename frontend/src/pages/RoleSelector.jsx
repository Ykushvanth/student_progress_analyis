import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/RoleSelector.css';

export function RoleSelector() {
  const { user, roles, selectRole, logout } = useAuth();
  const navigate = useNavigate();

  function handleRoleSelect(roleName) {
    selectRole(roleName);
    navigate(getRoleHomePage(roleName));
  }

  function getRoleHomePage(role) {
    const roleRoutes = {
      'Faculty': '/faculty',
      'HOD': '/hod',
      'Dean': '/dean',
      'IQAC': '/iqac',
      'Admin': '/admin'
    };
    return roleRoutes[role] || '/';
  }

  function getRoleDescription(roleName) {
    const descriptions = {
      'Faculty': 'Enter student analysis and sessional marks',
      'HOD': 'View department analytics and faculty performance',
      'Dean': 'View school-wide analytics and reports',
      'IQAC': 'Manage workflow stages and view system-wide analytics',
      'Admin': 'Manage users, roles, and system configuration'
    };
    return descriptions[roleName] || 'Access role-specific features';
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!user || roles.length === 0) {
    return null;
  }

  return (
    <div className="role-selector-container">
      <div className="role-selector-card">
        <h1>Select Your Role</h1>
        <p className="role-selector-subtitle">Choose how you want to access the system</p>

        <div className="user-info">
          <strong>{user.full_name}</strong>
          <span>{user.email}</span>
        </div>

        <div className="role-list">
          {roles.map((role) => (
            <div
              key={role.role_id}
              className="role-card"
              onClick={() => handleRoleSelect(role.role_name)}
            >
              <h3>{role.role_name}</h3>
              <p>{getRoleDescription(role.role_name)}</p>
            </div>
          ))}
        </div>

        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
}
