import React from 'react';
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Legend,
} from 'recharts';
import { useAppData } from '../context/AppDataContext.jsx';
import SkeletonPanel from '../components/ui/SkeletonPanel.jsx';

const pieColors = ['#22c55e', '#ef4444'];

function statusClass(status) {
  if (status === 'Critical') return 'status-critical';
  if (status === 'Warning') return 'status-warning';
  return 'status-normal';
}

export default function DashboardPage() {
  const { stats, trafficSeries, loading, error, settings } = useAppData();
  const isBlueTheme = settings?.theme === 'blue';

  const tooltipContentStyle = isBlueTheme
    ? { background: '#0b2f54', border: '1px solid #3b82f6', color: '#ffffff' }
    : { background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' };

  const tooltipLabelStyle = isBlueTheme ? { color: '#ffffff' } : { color: '#cbd5e1' };
  const tooltipItemStyle = isBlueTheme ? { color: '#ffffff' } : { color: '#e2e8f0' };

  const detectionRate = stats.totalTraffic > 0
    ? Math.round((stats.anomalies / stats.totalTraffic) * 100)
    : 0;

  const threatLookup = Object.fromEntries((stats.threatCategoryCounts || []).map((item) => [item._id, item.count]));
  const jammingEvents = threatLookup.Jamming || 0;
  const spoofingEvents = threatLookup.Spoofing || 0;
  const intrusionEvents = threatLookup.Intrusion || 0;
  const mixedEvents = threatLookup.Mixed || 0;

  const pieData = [
    { name: 'Normal', value: stats.normalTraffic },
    { name: 'Attack', value: stats.attackTraffic },
  ];

  if (loading && !trafficSeries.length) {
    return (
      <div className="stats-grid">
        <SkeletonPanel />
        <SkeletonPanel />
        <SkeletonPanel />
      </div>
    );
  }

  if (!trafficSeries.length) {
    return (
      <div className="page-stack">
        <section className="panel">
          <h3>No traffic data yet</h3>
          <p style={{ color: 'var(--txt-dim)', marginTop: 8 }}>
            The dashboard is connected, but MongoDB does not have enough traffic history to draw the chart yet.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack dashboard-shell">
      {error ? <div className="error-box">{error}</div> : null}

      <section className="dashboard-hero panel">
        <div>
          <p className="eyebrow">Operational Overview</p>
          <h2>Command Intelligence Dashboard</h2>
          <p className="dashboard-hero-sub">Live posture of network traffic, anomaly pressure, and protocol behavior.</p>
        </div>
        <div className="dashboard-hero-badges">
          <span className="hero-badge">Detection Rate: {detectionRate}%</span>
          <span className="hero-badge">Threat Level: {stats.attackPercent}%</span>
          <span className="hero-badge">Signal: {stats.signalStatus}</span>
          <span className={`hero-badge hero-status ${statusClass(stats.systemStatus)}`}>{stats.systemStatus}</span>
        </div>
      </section>

      <section className="stats-grid dashboard-metrics">
        <article className="stat-card metric-card">
          <p className="stat-label">Total Traffic</p>
          <h3>{stats.totalTraffic}</h3>
          <p className="metric-subtext">packets analyzed</p>
        </article>
        <article className="stat-card stat-danger metric-card">
          <p className="stat-label">Anomalies Detected</p>
          <h3>{stats.anomalies}</h3>
          <p className="metric-subtext">threats identified</p>
        </article>
        <article className="stat-card metric-card">
          <p className="stat-label">Active Nodes</p>
          <h3>{stats.activeNodes}</h3>
          <p className="metric-subtext">unique endpoints</p>
        </article>
        <article className={`stat-card metric-card ${statusClass(stats.systemStatus)}`}>
          <p className="stat-label">System Status</p>
          <h3>{stats.systemStatus}</h3>
          <p className="metric-subtext">{stats.attackPercent}% threat level</p>
        </article>
        <article className="stat-card metric-card metric-safe">
          <p className="stat-label">Detection Rate</p>
          <h3>{detectionRate}%</h3>
        </article>
        <article className="stat-card metric-card">
          <p className="stat-label">Signal Availability</p>
          <h3>{stats.signalHealth?.availability ?? 100}%</h3>
          <p className="metric-subtext">communication uptime estimate</p>
        </article>
        <article className="stat-card metric-card">
          <p className="stat-label">Signal Integrity</p>
          <h3>{stats.signalHealth?.integrity ?? 100}%</h3>
          <p className="metric-subtext">tamper resistance estimate</p>
        </article>
        <article className="stat-card metric-card">
          <p className="stat-label">Jamming Risk</p>
          <h3>{stats.signalHealth?.jammingRisk ?? 0}%</h3>
          <p className="metric-subtext">EW disruption pressure</p>
        </article>
        <article className="stat-card metric-card">
          <p className="stat-label">Spoofing Risk</p>
          <h3>{stats.signalHealth?.spoofingRisk ?? 0}%</h3>
          <p className="metric-subtext">identity manipulation pressure</p>
        </article>
        <article className="stat-card metric-card">
          <p className="stat-label">Intrusion Risk</p>
          <h3>{stats.signalHealth?.intrusionRisk ?? 0}%</h3>
          <p className="metric-subtext">unauthorized access pressure</p>
        </article>
      </section>

      <section className="chart-grid dashboard-chart-grid-main">
        <article className="chart-card dashboard-chart-card">
          <div className="chart-head">
            <h3>Traffic Over Time</h3>
            <span>Normal vs Anomaly Trend</span>
          </div>
          <div className="chart-body dashboard-chart-lg">
            {loading && !trafficSeries.length ? (
              <p style={{ color: 'var(--txt-dim)' }}>Loading chart data...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficSeries}>
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="normal" stroke="#22c55e" strokeWidth={2.4} dot={false} name="Normal" />
                  <Line type="monotone" dataKey="attack" stroke="#ef4444" strokeWidth={2.4} dot={false} name="Anomaly" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="chart-card dashboard-chart-card">
          <div className="chart-head">
            <h3>Traffic Distribution</h3>
            <span>Attack Ratio Snapshot</span>
          </div>
          <div className="chart-body dashboard-chart-lg">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label>
                  {pieData.map((entry, idx) => (
                    <Cell key={entry.name} fill={pieColors[idx]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-footnote">
              <div className="footnote-safe">Normal: {stats.normalTraffic}</div>
              <div className="footnote-danger">Attack: {stats.attackTraffic}</div>
            </div>
          </div>
        </article>

        <article className="chart-card dashboard-chart-card">
          <div className="chart-head">
            <h3>Threat Pattern Breakdown</h3>
            <span>Jamming / Spoofing / Intrusion / Mixed</span>
          </div>
          <div className="chart-body dashboard-chart-lg" style={{ height: 220 }}>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <article className="stat-card">
                <p className="stat-label">Jamming</p>
                <h3>{jammingEvents}</h3>
              </article>
              <article className="stat-card">
                <p className="stat-label">Spoofing</p>
                <h3>{spoofingEvents}</h3>
              </article>
              <article className="stat-card">
                <p className="stat-label">Intrusion</p>
                <h3>{intrusionEvents}</h3>
              </article>
              <article className="stat-card">
                <p className="stat-label">Mixed</p>
                <h3>{mixedEvents}</h3>
              </article>
            </div>
            <p style={{ marginTop: 12, color: 'var(--txt-dim)', fontSize: 13 }}>
              Anomaly rate in current window: {stats.anomalyRate ?? detectionRate}%
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
