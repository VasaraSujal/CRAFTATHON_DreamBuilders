import React, { useEffect } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppData } from '../context/AppDataContext.jsx';
import { getStatusRowClass, getThreatCategory } from '../utils/trafficDisplay.js';

export default function MonitoringPage() {
  const { liveTraffic, loading, error, refreshData, isTrackingLive, setIsTrackingLive } = useAppData();

  useEffect(() => {
    if (isTrackingLive) {
      refreshData();
    }
  }, [refreshData, isTrackingLive]);

  const graphData = liveTraffic.slice(0, 12).reverse().map((item) => ({
    time: item.time,
    packetSize: item.packetSize,
  }));

  const latestSignal = liveTraffic[0] || null;

  return (
    <div className="page-stack">
      {error ? <div className="error-box">{error}</div> : null}

      <section className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Live Monitoring Control</h3>
          <div style={{ fontSize: 12, color: 'var(--txt-dim)', marginTop: 4 }}>
            {isTrackingLive ? '🟢 Tracking ACTIVE' : '🔴 Tracking PAUSED'}
          </div>
          {latestSignal ? (
            <div style={{ fontSize: 12, color: 'var(--txt-dim)', marginTop: 4 }}>
              Availability {latestSignal.signalAvailability ?? '-'}% | Integrity {latestSignal.signalIntegrity ?? '-'}% | Threat {getThreatCategory(latestSignal)}
            </div>
          ) : null}
        </div>
        <button
          onClick={() => setIsTrackingLive(!isTrackingLive)}
          style={{
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 'bold',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            background: isTrackingLive ? '#ff4444' : '#44aa44',
            color: 'white',
            transition: 'all 0.3s ease',
          }}
        >
          {isTrackingLive ? 'STOP' : 'START'} TRACKING
        </button>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Live Packet Size Stream (Auto-refresh)</h3>
        <div className="chart-body" style={{ height: 290 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData}>
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              <Line isAnimationActive type="monotone" dataKey="packetSize" stroke="#38bdf8" strokeWidth={2.4} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Live Traffic Table</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Destination</th>
                <th>Protocol</th>
                <th>Packet Size</th>
                <th>Time</th>
                <th>Status</th>
                <th>Threat Category</th>
                <th>Availability</th>
                <th>Integrity</th>
              </tr>
            </thead>
            <tbody>
              {loading && liveTraffic.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ color: 'var(--txt-dim)' }}>Loading real-time data...</td>
                </tr>
              ) : liveTraffic.map((item, index) => (
                <tr key={item._id || item.id || `${item.source}-${item.destination}-${item.timestamp || index}`}>
                  <td>{item.source}</td>
                  <td>{item.destination}</td>
                  <td>{item.protocol}</td>
                  <td>{item.packetSize}</td>
                  <td>{new Date(item.timestamp || Date.now()).toLocaleTimeString([], { hour12: false })}</td>
                  <td className={getStatusRowClass(item.status)}>{item.status}</td>
                  <td>{getThreatCategory(item)}</td>
                  <td>{item.signalAvailability ?? '-'}</td>
                  <td>{item.signalIntegrity ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
