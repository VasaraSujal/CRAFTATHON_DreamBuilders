import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Alerts from '../components/Alerts.jsx';
import Dashboard from '../components/Dashboard.jsx';
import Logs from '../components/Logs.jsx';
import NetworkGraph from '../components/NetworkGraph.jsx';
import SimulationControls from '../components/SimulationControls.jsx';
import SummaryCards from '../components/SummaryCards.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchAlerts, fetchStats, fetchTraffic, simulateTraffic } from '../services/api';

const POLL_MS = 6000;

function getRoleLabel(role) {
  if (role === 'Monitor') return 'Monitor';
  return role || 'Monitor';
}

export default function Home() {
  const { user, logout } = useAuth();
  const [traffic, setTraffic] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    totalTraffic: 0,
    totalAlerts: 0,
    alertsBySeverity: [],
    trafficByStatus: [],
    recentAlerts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = async () => {
    setError('');
    try {
      const [trafficData, alertData, statsData] = await Promise.all([
        fetchTraffic(),
        fetchAlerts(),
        fetchStats(),
      ]);
      setTraffic(trafficData);
      setAlerts(alertData);
      setStats(statsData);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch dashboard data.');
      if (err?.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = useMemo(() => getRoleLabel(user?.role), [user]);

  const highSeverityCount = useMemo(() => {
    const items = stats.alertsBySeverity || [];
    return items
      .filter((item) => item._id === 'High' || item._id === 'Critical')
      .reduce((sum, item) => sum + (item.count || 0), 0);
  }, [stats.alertsBySeverity]);

  const onSimulate = async (type) => {
    try {
      await simulateTraffic(type);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'Simulation failed.');
    }
  };

  useEffect(() => {
    if (!user?.token) {
      return;
    }

    loadAll();
    const timer = setInterval(loadAll, POLL_MS);
    return () => clearInterval(timer);
  }, [user?.token]);

  return (
    <main className="home-page">
      <Navbar />

      <header className="topbar home-hero">
        <div className="home-hero-left">
          <p className="eyebrow">Secure Military Communication Monitoring System</p>
          <h1 className="home-hero-title">Operational Threat Dashboard</h1>
          <p className="home-hero-subtitle">
            Real-time metadata surveillance with threat analysis, network visibility, and secure audit logging.
          </p>

          <div className="home-hero-badges">
            <span className="hero-badge">Role: {roleLabel}</span>
            <span className="hero-badge">Tracked Links: {stats.totalTraffic || 0}</span>
            <span className="hero-badge">High Risk Alerts: {highSeverityCount}</span>
          </div>
        </div>

        <div className="topbar-right home-hero-right">
          <div className="identity-box home-identity">
            <span className="home-identity-name">{user?.name}</span>
            <p>{roleLabel}</p>
          </div>
          <button type="button" className="btn-muted" onClick={loadAll}>Refresh</button>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      {loading ? (
        <div className="loading-box">Loading command center data...</div>
      ) : (
        <div className="home-content-stack">
          <SummaryCards stats={stats} />

          <section className="home-feature-grid">
            <SimulationControls onSimulate={onSimulate} role={user?.role} />
            <section className="panel home-quick-brief">
              <div className="panel-title-row">
                <h2>Command Brief</h2>
              </div>
              <ul className="home-brief-list">
                <li>Total alerts logged: {stats.totalAlerts || 0}</li>
                <li>Recent alerts in queue: {(stats.recentAlerts || []).length}</li>
                <li>Traffic records available: {(traffic || []).length}</li>
                <li>Last role sync: {roleLabel} access policy active</li>
              </ul>
            </section>
          </section>

          <Dashboard traffic={traffic} stats={stats} />

          <div className="double-grid home-dual-panels">
            <Alerts alerts={alerts} />
            <NetworkGraph traffic={traffic} />
          </div>

          <Logs traffic={traffic} />
        </div>
      )}
    </main>
  );
}
