import React, { useEffect, useState } from 'react';
import NetworkGraph from '../components/NetworkGraph.jsx';
import { fetchTraffic } from '../services/api';
import { useAppData } from '../context/AppDataContext.jsx';

export default function NetworkGraphPage() {
  const { settings, isTrackingLive } = useAppData();
  const [traffic, setTraffic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadTraffic = async () => {
      try {
        if (loading) setLoading(true);
        const data = await fetchTraffic();
        if (!mounted) return;
        setTraffic(Array.isArray(data) ? data : []);
        setError('');
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Unable to load network traffic');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTraffic();

    if (!isTrackingLive) {
      return () => {
        mounted = false;
      };
    }

    const timer = setInterval(() => {
      loadTraffic();
    }, Math.max(1, Number(settings?.refreshInterval) || 5) * 1000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [settings?.refreshInterval, isTrackingLive]);

  if (loading) {
    return (
      <section className="panel">
        <div style={{ padding: 16, color: 'var(--txt-dim)' }}>Loading network graph...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <div className="error-box">{error}</div>
      </section>
    );
  }

  if (!traffic.length) {
    return (
      <section className="panel">
        <div style={{ padding: 16, color: 'var(--txt-dim)' }}>No traffic logs available yet.</div>
      </section>
    );
  }

  return <NetworkGraph traffic={traffic} />;
}
