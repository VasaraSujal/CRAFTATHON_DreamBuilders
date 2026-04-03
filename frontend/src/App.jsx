import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MonitoringPage from './pages/MonitoringPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import NetworkGraphPage from './pages/NetworkGraphPage.jsx';
import LogsPage from './pages/LogsPage.jsx';
import SimulationPage from './pages/SimulationPage.jsx';
import Users from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import { useAuth } from './context/AuthContext.jsx';

function ProtectedRoute({ children, requiredRoles = null }) {
  const { user } = useAuth();

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <main className="home-page">
        <div className="error-box">
          <h2>Access Denied</h2>
          <p>Your role ({user.role}) cannot access this page.</p>
        </div>
      </main>
    );
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="network" element={<NetworkGraphPage />} />
        <Route path="logs" element={<ProtectedRoute requiredRoles={['Admin', 'Analyst']}><LogsPage /></ProtectedRoute>} />
        <Route path="simulation" element={<ProtectedRoute requiredRoles={['Admin']}><SimulationPage /></ProtectedRoute>} />
        <Route path="settings" element={<Settings />} />
        <Route 
          path="users"
          element={
            <ProtectedRoute requiredRoles={['Admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

export default App;
