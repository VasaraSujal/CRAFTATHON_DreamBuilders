import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleOptions = ['Admin', 'Analyst', 'Monitor'];

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Monitor',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-grid-bg" />
      <section className="login-card">
        <h1>Secure Comm Monitoring</h1>
        <p>Defence-grade traffic intelligence dashboard</p>

        <div className="mode-toggle">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
            type="button"
          >
            Register
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === 'register' ? (
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Officer Name"
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="commander@defence.gov"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="******"
            />
          </label>

          {mode === 'register' ? (
            <label>
              Role
              <select value={form.role} onChange={(e) => update('role', e.target.value)}>
                {roleOptions.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {error ? <div className="error-box">{error}</div> : null}

          <button type="submit" className="btn btn-danger" disabled={loading}>
            {loading ? 'Processing...' : mode === 'login' ? 'Enter Dashboard' : 'Create Account'}
          </button>
        </form>
      </section>
    </main>
  );
}
