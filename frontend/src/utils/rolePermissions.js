/**
 * Role-based Permissions System
 * Defines capabilities for each role in the system
 */

export const ROLES = {
  ADMIN: 'Admin',
  ANALYST: 'Analyst',
  MONITOR: 'Monitor',
};

export const ROLE_DESCRIPTIONS = {
  Admin: {
    title: 'Administrator',
    description: 'Full system access including user management, settings, and all alerts',
    capabilities: [
      'View all users',
      'Create, update, delete users',
      'Access system settings',
      'View all alerts (including archived)',
      'Manage user roles',
      'View system logs',
    ],
  },
  Analyst: {
    title: 'Security Analyst',
    description: 'Can analyze traffic, create reports, and manage personal alert filters',
    capabilities: [
      'View dashboard and monitoring',
      'Analyze live traffic data',
      'Create and export reports',
      'Filter and manage alerts',
      'Access network graph',
      'View logs and history',
      'Access system settings',
    ],
  },
  Monitor: {
    title: 'Traffic Monitor',
    description: 'Read-only access to live monitoring and alerts (cannot modify data)',
    capabilities: [
      'View live traffic monitoring',
      'View real-time alerts',
      'Access network graph (view-only)',
      'View dashboard statistics',
      'Access system settings',
    ],
  },
};

export const PERMISSIONS = {
  Admin: {
    canManageUsers: true,
    canAccessSettings: true,
    canViewAllAlerts: true,
    canDeleteAlerts: true,
    canExportData: true,
    canCreateReports: true,
    canModifyTraffic: true,
    canViewLogs: true,
    readOnly: false,
  },
  Analyst: {
    canManageUsers: false,
    canAccessSettings: false, // Can only view own settings
    canViewAllAlerts: true,
    canDeleteAlerts: false, // Can only archive their own
    canExportData: true,
    canCreateReports: true,
    canModifyTraffic: false,
    canViewLogs: true,
    readOnly: false,
  },
  Monitor: {
    canManageUsers: false,
    canAccessSettings: false,
    canViewAllAlerts: true,
    canDeleteAlerts: false,
    canExportData: false,
    canCreateReports: false,
    canModifyTraffic: false,
    canViewLogs: false,
    readOnly: true,
  },
};

export const hasPermission = (role, permission) => {
  return PERMISSIONS[role]?.[permission] ?? false;
};

export const canAccessPage = (role, page) => {
  const pageAccessMap = {
    users: ['Admin'],
    settings: ['Admin', 'Analyst', 'Monitor'],
    dashboard: ['Admin', 'Analyst', 'Monitor'],
    monitoring: ['Admin', 'Analyst', 'Monitor'],
    alerts: ['Admin', 'Analyst', 'Monitor'],
    network: ['Admin', 'Analyst', 'Monitor'],
    logs: ['Admin', 'Analyst'],
    simulation: ['Admin'],
    reports: ['Analyst', 'Admin'],
  };

  return pageAccessMap[page]?.includes(role) ?? false;
};
