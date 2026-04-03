import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleMenuMap = {
  Admin: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Users', path: '/users' },
    { label: 'Settings', path: '/settings' },
    { label: 'Audit', path: '/audit' },
  ],
  Analyst: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Settings', path: '/settings' },
  ],
  Monitor: [
    { label: 'Dashboard', path: '/dashboard' },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const role = user?.role || 'Monitor';
  const menuItems = roleMenuMap[role] || roleMenuMap.Monitor;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>🛡️ Secure Comm</h2>
      </div>

      <ul className="navbar-menu">
        {menuItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `navbar-link${isActive ? ' active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="navbar-right">
        <span className="role-badge">{role}</span>
        <button className="btn btn-logout" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
