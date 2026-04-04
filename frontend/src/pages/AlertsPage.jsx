import React, { useMemo, useState } from 'react';
import { useAppData } from '../context/AppDataContext.jsx';

export default function AlertsPage() {
  const { recentAlerts, alerts } = useAppData();
  const [selectedSeverity, setSelectedSeverity] = useState('All');

  const sourceAlerts = recentAlerts.length ? recentAlerts : alerts.map((item) => ({
    id: item._id,
    message: item.message,
    severity: item.severity,
    timestamp: item.timestamp,
    source: item.logId?.source || 'Unknown',
    destination: item.logId?.destination || 'Unknown',
  }));

  const severityColor = (severity) => {
    if (severity === 'Critical') return '#ff4444';
    if (severity === 'High') return '#ff8844';
    if (severity === 'Medium') return '#ffaa00';
    return '#88aa88';
  };

  const filteredAlerts = useMemo(() => {
    if (selectedSeverity === 'All') return sourceAlerts;
    return sourceAlerts.filter((alert) => alert.severity === selectedSeverity);
  }, [sourceAlerts, selectedSeverity]);

  const countBySeverity = useMemo(() => ({
    Critical: sourceAlerts.filter((a) => a.severity === 'Critical').length,
    High: sourceAlerts.filter((a) => a.severity === 'High').length,
    Medium: sourceAlerts.filter((a) => a.severity === 'Medium').length,
  }), [sourceAlerts]);

  return (
    <div className="page-stack alerts-shell">
      <section className="panel alerts-hero">
        <div>
          <p className="eyebrow">Threat Control Center</p>
          <h2>Real-Time Alert Feed</h2>
          <p className="alerts-hero-sub">Focused stream of active security events detected by the monitoring engine.</p>
        </div>
        <div className="alerts-severity-group">
          {['All', 'Critical', 'High', 'Medium'].map((level) => (
            <button
              key={level}
              type="button"
              className={`alerts-chip ${selectedSeverity === level ? 'active' : ''}`}
              onClick={() => setSelectedSeverity(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </section>

      <section className="stats-grid alerts-summary-grid">
        <article className="stat-card metric-card metric-critical">
          <p className="stat-label">Critical</p>
          <h3>{countBySeverity.Critical}</h3>
        </article>
        <article className="stat-card metric-card metric-high">
          <p className="stat-label">High</p>
          <h3>{countBySeverity.High}</h3>
        </article>
        <article className="stat-card metric-card metric-medium">
          <p className="stat-label">Medium</p>
          <h3>{countBySeverity.Medium}</h3>
        </article>
      </section>

      <section className="panel alerts-feed-panel">
        <div className="chart-head">
          <h3>Active Threat Timeline</h3>
          <span>{filteredAlerts.length} alerts visible</span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="alerts-empty">
            <div className="alerts-empty-mark">Secure</div>
            <div className="alerts-empty-title">All Systems Normal</div>
            <div className="alerts-empty-copy">No anomaly or threat detected for the selected filter.</div>
          </div>
        ) : (
          <div className="alerts-timeline">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="alerts-timeline-item"
                style={{ borderColor: severityColor(alert.severity) }}
              >
                <div className="alerts-timeline-top">
                  <div className="alerts-item-title" style={{ color: severityColor(alert.severity) }}>
                    [{alert.severity}] {alert.message}
                  </div>
                  <div className="alerts-item-time">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour12: false })}
                  </div>
                </div>
                <div className="alerts-item-route">
                  <span>Source: {alert.source}</span>
                  <span>Destination: {alert.destination}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
