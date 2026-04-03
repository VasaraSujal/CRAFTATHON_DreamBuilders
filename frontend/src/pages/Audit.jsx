import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';

export default function Audit() {
  const { user } = useAuth();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const response = await api.get('/api/audit');
        setAudit(response.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to fetch audit data');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'Admin') {
      fetchAudit();
    }
  }, [user]);

  if (user?.role !== 'Admin') {
    return (
      <main className="home-page">
        <Navbar />
        <div className="error-box">
          <h2>Access Denied</h2>
          <p>Only Admins can access Audit logs.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="home-page">
      <Navbar />

      <section className="panel">
        <div className="panel-title-row">
          <h2>Audit Summary</h2>
        </div>

        {error ? <div className="error-box">{error}</div> : null}

        {loading ? (
          <div className="loading-box">Loading audit data...</div>
        ) : audit ? (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <p className="stat-label">Total Logs</p>
                <h3>{audit.totalLogs}</h3>
              </div>
              <div className="stat-card">
                <p className="stat-label">Total Alerts</p>
                <h3>{audit.totalAlerts}</h3>
              </div>
              <div className="stat-card">
                <p className="stat-label">Unresolved Alerts</p>
                <h3>{audit.unresolvedAlerts}</h3>
              </div>
            </div>

            <article className="chart-card">
              <h3>Attacks by Type</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Attack Type</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.attacksByType?.length > 0 ? (
                      audit.attacksByType.map((item) => (
                        <tr key={item._id}>
                          <td>{item._id}</td>
                          <td>{item.count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2}>No attacks detected</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="chart-card">
              <h3>Traffic by Protocol</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Protocol</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.trafficByProtocol?.length > 0 ? (
                      audit.trafficByProtocol.map((item) => (
                        <tr key={item._id}>
                          <td>{item._id}</td>
                          <td>{item.count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2}>No traffic data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="chart-card">
              <h3>Top Talkers (Source IPs)</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Source IP</th>
                      <th>Packets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.topTalkers?.length > 0 ? (
                      audit.topTalkers.map((item) => (
                        <tr key={item._id}>
                          <td>{item._id}</td>
                          <td>{item.count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2}>No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <p className="timestamp">
              Generated: {new Date(audit.generatedAt).toLocaleString()}
            </p>
          </>
        ) : null}
      </section>
    </main>
  );
}
