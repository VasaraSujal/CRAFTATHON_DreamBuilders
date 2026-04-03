import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const navByRole = {
  Admin: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/monitoring', label: 'Real-Time Monitoring' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/network', label: 'Network Graph' },
    { to: '/logs', label: 'Logs' },
    { to: '/simulation', label: 'Attack Simulation' },
    { to: '/users', label: 'User Management' },
    { to: '/settings', label: 'Settings' },
  ],
  Analyst: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/monitoring', label: 'Real-Time Monitoring' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/network', label: 'Network Graph' },
    { to: '/logs', label: 'Logs' },
    { to: '/simulation', label: 'Attack Simulation' },
    { to: '/settings', label: 'Settings' },
  ],
  Operator: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/monitoring', label: 'Real-Time Monitoring' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/network', label: 'Network Graph' },
    { to: '/logs', label: 'Logs' },
    { to: '/settings', label: 'Settings' },
  ],
};

export default function Sidebar({ open, setOpen }) {
  const { user } = useAuth();
  const role = user?.role || 'Operator';
  const links = navByRole[role] || navByRole.Operator;

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-title">
        <p className="sidebar-kicker">Secure Military</p>
        <h1>Comm Monitoring</h1>
      </div>

      <nav className="sidebar-nav">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
