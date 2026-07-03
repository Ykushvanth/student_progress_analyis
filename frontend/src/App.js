import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { RoleSelector } from './pages/RoleSelector';
import { FacultyDashboard } from './pages/faculty/FacultyDashboard';
import { HodDashboard } from './pages/hod/HodDashboard';
import { DeanDashboard } from './pages/dean/DeanDashboard';
import { IqacDashboard } from './pages/iqac/IqacDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/select-role" element={<RoleSelector />} />

          <Route
            path="/faculty/*"
            element={
              <ProtectedRoute allowedRoles={['Faculty']}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hod/*"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <HodDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dean/*"
            element={
              <ProtectedRoute allowedRoles={['Dean']}>
                <DeanDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/iqac/*"
            element={
              <ProtectedRoute allowedRoles={['IQAC']}>
                <IqacDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
