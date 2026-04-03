import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleOptions = ['Monitor', 'Operator', 'Analyst'];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Monitor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, password, role });
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-grid-bg" />

      <section className="auth-card auth-hero auth-hero-register">
        <p className="sidebar-kicker">Secure Operations</p>
        <h1>Create Monitoring Account</h1>
        <p className="auth-copy">
          Register a user account to access the secure monitoring dashboard, alerts, and live traffic tools.
        </p>

        <div className="auth-hero-stats">
          <div>
            <strong>Access Levels</strong>
            <span>Monitor, Operator, Analyst</span>
          </div>
          <div>
            <strong>Protected Data</strong>
            <span>Real-time threat feed</span>
          </div>
          <div>
            <strong>Styled for Theme</strong>
            <span>Matches app console UI</span>
          </div>
        </div>
      </section>

      <section className="auth-card auth-form-card">
        <div className="auth-header-row">
          <div>
            <p className="eyebrow">Register</p>
            <h2>New Account</h2>
          </div>
          <span className="status-chip status-warning">Public Signup</span>
        </div>

        <p className="auth-note">Fill in the details to create a secure user profile.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="setting-item">
            <span>Full Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label className="setting-item">
            <span>Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label className="setting-item">
            <span>Password</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          <label className="setting-item">
            <span>Confirm Password</span>
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </label>

          <label className="setting-item">
            <span>Role</span>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              {roleOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          {error ? <div className="error-box">{error}</div> : null}

          <button className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer-link">
          <span>Already have an account?</span>
          <Link to="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}
