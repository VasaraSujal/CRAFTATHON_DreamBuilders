import React, { useMemo, useState } from 'react';

export default function Logs({ traffic = [] }) {
  const [severity, setSeverity] = useState('All');
  const [attackType, setAttackType] = useState('All');
  const [timeWindow, setTimeWindow] = useState('24h');

  const filtered = useMemo(() => {
    const now = Date.now();

    return traffic.filter((item) => {
      const timeMatch = (() => {
        if (timeWindow === 'all') return true;
        const itemTime = new Date(item.timestamp).getTime();
        const diffMs = now - itemTime;
        if (timeWindow === '1h') return diffMs <= 60 * 60 * 1000;
        if (timeWindow === '6h') return diffMs <= 6 * 60 * 60 * 1000;
        return diffMs <= 24 * 60 * 60 * 1000;
      })();

      const severityMatch = severity === 'All' || item.severity === severity;
      const attackMatch =
        attackType === 'All' ||
        (attackType === 'None' ? item.attackType === 'None' : item.attackType === attackType);

      return timeMatch && severityMatch && attackMatch;
    });
  }, [traffic, severity, attackType, timeWindow]);

  return (
    <section className="panel">
      <div className="panel-title-row">
        <h2>Activity Logs Viewer</h2>
      </div>

      <div className="filters-row">
        <select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)}>
          <option value="1h">Last 1 hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="all">All time</option>
        </select>

        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="All">All Severities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>

        <select value={attackType} onChange={(e) => setAttackType(e.target.value)}>
          <option value="All">All Attacks</option>
          <option value="None">None</option>
          <option value="DDoS">DDoS</option>
          <option value="Intrusion">Intrusion</option>
          <option value="Spoofing">Spoofing</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Protocol</th>
              <th>Status</th>
              <th>Attack Type</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">No logs match your filters.</td>
              </tr>
            ) : (
              filtered.slice(0, 80).map((item) => (
                <tr key={item._id}>
                  <td>{new Date(item.timestamp).toLocaleTimeString()}</td>
                  <td>{item.source}</td>
                  <td>{item.destination}</td>
                  <td>{item.protocol}</td>
                  <td className={item.status === 'Anomaly' ? 'txt-danger' : 'txt-safe'}>{item.status}</td>
                  <td>{item.attackType}</td>
                  <td>{item.severity}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
