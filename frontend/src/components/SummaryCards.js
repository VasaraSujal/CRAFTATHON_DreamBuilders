import React from 'react';

function StatCard({ label, value, trend, tone = 'neutral' }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <p className="stat-label">{label}</p>
      <h3>{value}</h3>
      {trend ? <span className="stat-trend">{trend}</span> : null}
    </div>
  );
}

export default function SummaryCards({ stats }) {
  const severityMap = stats.alertsBySeverity?.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {}) || {};

  const trafficMap = stats.trafficByStatus?.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {}) || {};

  return (
    <section className="stats-grid">
      <StatCard
        label="Total Traffic Logs"
        value={stats.totalTraffic ?? 0}
        trend="Last 100 events monitored"
        tone="neutral"
      />
      <StatCard
        label="Total Alerts"
        value={stats.totalAlerts ?? 0}
        trend="Live anomaly indicators"
        tone="danger"
      />
      <StatCard
        label="Normal vs Anomaly"
        value={`${trafficMap.Normal || 0} / ${trafficMap.Anomaly || 0}`}
        trend="Normal / Anomaly"
        tone="safe"
      />
      <StatCard
        label="Critical + High"
        value={(severityMap.Critical || 0) + (severityMap.High || 0)}
        trend="Priority response required"
        tone="warning"
      />
    </section>
  );
}
