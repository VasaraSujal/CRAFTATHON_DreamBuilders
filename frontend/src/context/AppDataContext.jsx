import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAlerts,
  fetchLiveTraffic,
  fetchStats,
  simulateTraffic,
} from '../services/api';

const AppDataContext = createContext(null);

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const SETTINGS_KEY = 'appSettings';
const LOCAL_TRAFFIC_KEY = 'realtimeLocalTraffic';

function loadStoredTraffic() {
  try {
    const raw = localStorage.getItem(LOCAL_TRAFFIC_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function severityRank(level) {
  if (level === 'Critical') return 100;
  if (level === 'High') return 75;
  if (level === 'Medium') return 50;
  if (level === 'Low') return 25;
  return 0;
}

export function AppDataProvider({ children }) {
  const lastAlertIdRef = useRef(null);
  const lastLiveIdRef = useRef(null);
  const liveTrafficRef = useRef([]);
  const [trafficSeries, setTrafficSeries] = useState([]);
  const storedTraffic = loadStoredTraffic();
  const [liveTraffic, setLiveTraffic] = useState(storedTraffic);
  const [rawAlerts, setRawAlerts] = useState([]);
  const [logs, setLogs] = useState(storedTraffic);
  const [statsApi, setStatsApi] = useState(null);
  const [users, setUsers] = useState([]);
  const [isTrackingLive, setIsTrackingLive] = useState(true);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore local storage parse issues
    }

    return {
      alertThreshold: 50,
      refreshInterval: 5,
      theme: 'dark',
    };
  });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    liveTrafficRef.current = liveTraffic;
  }, [liveTraffic]);

  const alerts = useMemo(() => {
    return rawAlerts.filter((item) => severityRank(item.severity) >= settings.alertThreshold);
  }, [rawAlerts, settings.alertThreshold]);

  const stats = useMemo(() => {
    const totalTraffic = statsApi?.totalTraffic ?? logs.length;
    const anomalies = statsApi?.trafficByStatus?.find((x) => x._id === 'Anomaly')?.count
      ?? logs.filter((item) => item.status === 'Anomaly').length;

    const activeNodes = new Set(logs.flatMap((item) => [item.source, item.destination])).size;

    const latest = trafficSeries[trafficSeries.length - 1] || { normal: 1, attack: 0 };
    const attackPercent = Math.round((latest.attack / Math.max(1, latest.normal + latest.attack)) * 100);

    let systemStatus = 'Normal';
    if (attackPercent >= 30) systemStatus = 'Critical';
    else if (attackPercent >= 15) systemStatus = 'Warning';

    return {
      totalTraffic,
      anomalies,
      activeNodes,
      attackPercent,
      systemStatus,
      normalTraffic: latest.normal,
      attackTraffic: latest.attack,
    };
  }, [logs, statsApi, trafficSeries]);

  const pushNotification = (message, severity = 'Medium') => {
    const id = makeId('ntf');
    setNotifications((prev) => [{ id, message, severity }, ...prev].slice(0, 4));
    setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  };

  const rebuildSeries = useCallback((trafficRows) => {
    const ordered = [...trafficRows].reverse();
    const map = new Map();

    ordered.forEach((row) => {
      const key = new Date(row.timestamp || Date.now()).toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      const current = map.get(key) || { time: key, normal: 0, attack: 0, total: 0 };
      if (row.status === 'Anomaly') current.attack += 1;
      else current.normal += 1;
      current.total += 1;
      map.set(key, current);
    });

    return Array.from(map.values()).slice(-12);
  }, []);

  const persistLocalTraffic = useCallback((nextRows) => {
    liveTrafficRef.current = nextRows;
    setLiveTraffic(nextRows);
    try {
      localStorage.setItem(LOCAL_TRAFFIC_KEY, JSON.stringify(nextRows));
    } catch {
      // ignore storage quota issues
    }
  }, []);

  const refreshData = useCallback(async ({ silent = true } = {}) => {
    if (!isTrackingLive) return; // Skip refresh if tracking paused

    if (!silent) {
      setLoading(true);
    }

    try {
      const [liveRow, alertRows, statsRows] = await Promise.all([
        fetchLiveTraffic(),
        fetchAlerts(),
        fetchStats(),
      ]);

      setError('');
      setRawAlerts(alertRows || []);
      setStatsApi(statsRows || null);

      if (liveRow && liveRow._id !== lastLiveIdRef.current) {
        lastLiveIdRef.current = liveRow._id;

        const nextLocalRows = [liveRow, ...liveTrafficRef.current].slice(0, 200);
        persistLocalTraffic(nextLocalRows);
        setLogs(nextLocalRows);
        setTrafficSeries(rebuildSeries(nextLocalRows));

        if (liveRow.status === 'Anomaly') {
          const severity = liveRow.severity || 'Medium';
          const message = liveRow.attackType ? `${liveRow.attackType} detected from ${liveRow.source}` : 'Anomaly detected';
          // Add to persistent alert panel instead of temporary notification
          setRecentAlerts((prev) => [
            { id: liveRow._id, message, severity, timestamp: new Date(), source: liveRow.source, destination: liveRow.destination },
            ...prev,
          ].slice(0, 10));
          pushNotification(message, severity);
        }
      } else {
        setLogs(liveTrafficRef.current);
        setTrafficSeries(rebuildSeries(liveTrafficRef.current));
      }

      if ((alertRows || []).length > 0 && alertRows[0]._id !== lastAlertIdRef.current) {
        const latest = alertRows[0];
        lastAlertIdRef.current = latest._id;
        pushNotification(latest.message, latest.severity || 'Medium');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to fetch real-time data from backend');
    } finally {
      setLoading(false);
    }
  }, [persistLocalTraffic, rebuildSeries]);

  const runSimulation = useCallback(async (type) => {
    await simulateTraffic(type);
    await refreshData({ silent: false });
  }, [refreshData]);

  useEffect(() => {
    refreshData({ silent: false });
  }, [refreshData]);

  useEffect(() => {
    if (!isTrackingLive) return; // Don't set interval when tracking paused

    const timer = setInterval(() => {
      refreshData();
    }, Math.max(1, Number(settings.refreshInterval) || 5) * 1000);

    return () => clearInterval(timer);
  }, [refreshData, settings.refreshInterval, isTrackingLive]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings]);

  const addUser = (payload) => {
    const user = { id: makeId('u'), ...payload };
    setUsers((prev) => [user, ...prev]);
  };

  const deleteUser = (id) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const updateUserRole = (id, role) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  const value = {
    trafficSeries,
    liveTraffic,
    alerts,
    recentAlerts,
    logs,
    stats,
    loading,
    error,
    settings,
    setSettings,
    refreshData,
    notifications,
    users,
    simulateAttack: runSimulation,
    addUser,
    deleteUser,
    updateUserRole,
    isTrackingLive,
    setIsTrackingLive,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
