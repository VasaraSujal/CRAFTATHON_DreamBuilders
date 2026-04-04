import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleOptions = ['Monitor', 'Analyst'];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Monitor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

      <section className="auth-card auth-hero">
        <div className="auth-hero-badge">CREATE ACCOUNT</div>
        <h1>Set Up Your Monitoring Profile</h1>
        <p className="auth-copy">
          Gain access to enterprise-grade threat intelligence, real-time alerts, and advanced network analytics. Start in minutes.
        </p>

        <div className="auth-hero-stats">
          <div className="stat-card">
            <strong>Role-Based Access</strong>
            <span>Monitor and Analyst roles</span>
          </div>
          <div className="stat-card">
            <strong>Enterprise Security</strong>
            <span>Military-grade encryption</span>
          </div>
          <div className="stat-card">
            <strong>Instant Setup</strong>
            <span>Start monitoring immediately</span>
          </div>
        </div>

        <div className="auth-hero-footer">
          <p className="auth-footer-text">Already have an account? Sign in instead</p>
        </div>
      </section>

      <section className="auth-card auth-form-card auth-form-register">
        <div className="auth-form-header">
          <h2>Create Your Account</h2>
          <p>Complete your profile to get started</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              className="input"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Work Email</label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="your@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <input
                id="confirmPassword"
                className="input"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Initial Role</label>
            <select
              id="role"
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <button
            className="btn-auth btn-auth-primary"
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-form-divider">
          <span>Already have an account?</span>
        </div>

        <Link to="/login" className="btn-auth btn-auth-secondary">
          Sign In
        </Link>

        <p className="auth-form-footer">Your data is encrypted and secure. Privacy first, always.</p>
      </section>
    </main>
  );
}
