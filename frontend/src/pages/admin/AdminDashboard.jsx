import React from 'react';
import { useAuth } from '../../context/AuthContext';

export function AdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '20px' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '2px solid #ddd',
        paddingBottom: '20px'
      }}>
        <div>
          <h1>Admin Dashboard</h1>
          <p style={{ color: '#666' }}>Welcome, {user?.full_name}</p>
        </div>
        <button
          onClick={logout}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3>User Management</h3>
          <p>Manage users, roles, and permissions</p>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3>System Configuration</h3>
          <p>Configure system settings and parameters</p>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3>Reports</h3>
          <p>View system-wide reports and analytics</p>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3>Database Management</h3>
          <p>Manage academic data and structures</p>
        </div>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px'
      }}>
        <h3>Admin Information</h3>
        <ul style={{ marginLeft: '20px' }}>
          <li><strong>Email:</strong> {user?.email}</li>
          <li><strong>Employee No:</strong> {user?.employee_no}</li>
          <li><strong>User ID:</strong> {user?.user_id}</li>
        </ul>
      </div>
    </div>
  );
}
