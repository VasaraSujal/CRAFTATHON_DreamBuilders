import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('admin@mil.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-grid-bg" />

      <section className="auth-card auth-hero">
        <p className="sidebar-kicker">Secure Operations</p>
        <h1>Communication Monitoring System</h1>
        <p className="auth-copy">
          Real-time threat monitoring, anomaly detection, and live network visibility in one command console.
        </p>

        <div className="auth-hero-stats">
          <div>
            <strong>Live Traffic</strong>
            <span>Backend driven</span>
          </div>
          <div>
            <strong>Threat Alerts</strong>
            <span>Critical / High / Medium</span>
          </div>
          <div>
            <strong>Network Graph</strong>
            <span>MongoDB powered</span>
          </div>
        </div>
      </section>

      <section className="auth-card auth-form-card">
        <div className="auth-header-row">
          <div>
            <p className="eyebrow">Sign In</p>
            <h2>Access Dashboard</h2>
          </div>
          <span className="status-chip status-normal">Secure Login</span>
        </div>

        <p className="auth-note">Use your authorized account to continue.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="setting-item">
            <span>Email</span>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label className="setting-item">
            <span>Password</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          {error ? <div className="error-box">{error}</div> : null}

          <button className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer-link">
          <span>New user?</span>
          <Link to="/register">Create an account</Link>
        </div>
      </section>
    </main>
  );
}
