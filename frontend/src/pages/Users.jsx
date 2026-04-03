import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createUserByAdmin,
  deleteUser,
  fetchUsers,
  updateUserRoleByAdmin,
} from '../services/api.js';
import { ROLE_DESCRIPTIONS } from '../utils/rolePermissions.js';

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Monitor',
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchUsers();
      setUsers(rows || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Admin') {
      loadUsers();
    }
  }, [user?.role]);

  const sortedUsers = useMemo(() => users, [users]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createUserByAdmin(form);
      setForm({ name: '', email: '', password: '', role: 'Monitor' });
      setShowForm(false);
      setSuccess('User created successfully');
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    setError('');
    setSuccess('');
    try {
      await deleteUser(userId);
      setSuccess('User deleted successfully');
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleRoleUpdate = async (userId, role) => {
    setError('');
    setSuccess('');
    try {
      await updateUserRoleByAdmin(userId, role);
      setSuccess('Role updated successfully');
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update role');
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <main className="panel">
        <div className="error-box">
          <h2>Access Denied</h2>
          <p>Only Admins can access User Management.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-stack">
      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Role Access Matrix</h3>
        <div className="stats-grid">
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, info]) => (
            <article key={role} className="panel">
              <p className="eyebrow">{role}</p>
              <h4 style={{ marginTop: 6 }}>{info.title}</h4>
              <p style={{ marginTop: 8, color: 'var(--txt-dim)' }}>{info.description}</p>
              <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                {info.capabilities.map((capability) => (
                  <li key={capability} style={{ marginBottom: 4 }}>{capability}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="controls-row" style={{ justifyContent: 'space-between' }}>
          <h2>User Management</h2>
          <div className="controls-row">
            <button className="btn-muted" onClick={loadUsers} disabled={loading}>Refresh</button>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add User'}
            </button>
          </div>
        </div>

        {error ? <div className="error-box" style={{ marginTop: 10 }}>{error}</div> : null}
        {success ? <div className="success-box" style={{ marginTop: 10 }}>{success}</div> : null}

        {showForm ? (
          <form onSubmit={handleAddUser} className="panel" style={{ marginTop: 10 }}>
            <label>
              Name
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Officer Name"
              />
            </label>

            <label>
              Email
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@defence.gov"
              />
            </label>

            <label>
              Password
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </label>

            <label>
              Role
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="Admin">Admin</option>
                <option value="Analyst">Analyst</option>
                <option value="Monitor">Monitor</option>
              </select>
            </label>

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </form>
        ) : null}

        <div className="table-wrap">
          <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--txt-dim)' }}>
                      Loading users...
                    </td>
                  </tr>
                ) : sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--txt-dim)' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((u) => (
                    <tr key={u._id || u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <select
                          className="input"
                          value={u.role}
                          onChange={(e) => handleRoleUpdate(u._id || u.id, e.target.value)}
                        >
                          <option value="Admin">Admin</option>
                          <option value="Analyst">Analyst</option>
                          <option value="Monitor">Monitor</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn-danger"
                          onClick={() => handleDeleteUser(u._id || u.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
