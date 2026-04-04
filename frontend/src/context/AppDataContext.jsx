import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAlerts,
  fetchLiveTraffic,
  fetchTraffic,
  fetchSignalStatus,
  fetchStats,
  simulateTraffic,
} from '../services/api';
import { useAuth } from './AuthContext.jsx';

const AppDataContext = createContext(null);

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const SETTINGS_KEY = 'appSettings';
const LOCAL_TRAFFIC_KEY = 'realtimeLocalTraffic';
const HISTORY_WINDOW_HOURS = 48;

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
  const { user } = useAuth();
  const lastAlertIdRef = useRef(null);
  const lastLiveIdRef = useRef(null);
  const liveTrafficRef = useRef([]);
  const [trafficSeries, setTrafficSeries] = useState([]);
  const storedTraffic = loadStoredTraffic();
  const [liveTraffic, setLiveTraffic] = useState(storedTraffic);
  const [rawAlerts, setRawAlerts] = useState([]);
  const [logs, setLogs] = useState(storedTraffic);
  const [statsApi, setStatsApi] = useState(null);
  const [signalStatusApi, setSignalStatusApi] = useState(null);
  const [users, setUsers] = useState([]);
  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [trackingStartedAt, setTrackingStartedAt] = useState(null);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    liveTrafficRef.current = liveTraffic;
  }, [liveTraffic]);

  const alerts = useMemo(() => {
    return rawAlerts.filter((item) => severityRank(item.severity) >= settings.alertThreshold);
  }, [rawAlerts, settings.alertThreshold]);

  const normalizeThreatCategory = (item) => {
    if (['Jamming', 'Spoofing', 'Intrusion', 'Mixed'].includes(item?.threatCategory)) {
      return item.threatCategory;
    }

    if (item?.attackType === 'DDoS') return 'Jamming';
    if (item?.attackType === 'Spoofing') return 'Spoofing';
    if (item?.attackType === 'Intrusion') return 'Intrusion';
    return 'Intrusion';
  };

  const threatCategoryCounts = useMemo(() => {
    const counts = logs.reduce((acc, item) => {
      const key = normalizeThreatCategory(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([key, count]) => ({ _id: key, count }));
  }, [logs]);

  const datasetCoverage = useMemo(() => {
    const counts = logs.reduce((acc, item) => {
      const key = item?.datasetSource || 'RealtimeStream';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([key, count]) => ({ _id: key, count }));
  }, [logs]);

  const stats = useMemo(() => {
    const totalTraffic = logs.length;
    const anomalies = logs.filter((item) => item.status === 'Anomaly').length;

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
      signalHealth: statsApi?.signalHealth || {
        availability: signalStatusApi?.availability ?? 100,
        integrity: signalStatusApi?.integrity ?? 100,
        jammingRisk: signalStatusApi?.maxJammingRisk ?? 0,
        spoofingRisk: signalStatusApi?.maxSpoofingRisk ?? 0,
        intrusionRisk: signalStatusApi?.maxIntrusionRisk ?? 0,
      },
      signalStatus: signalStatusApi?.signalStatus || 'Nominal',
      anomalyRate: signalStatusApi?.anomalyRate ?? attackPercent,
      threatCategoryCounts,
      datasetCoverage,
    };
  }, [logs, signalStatusApi, trafficSeries, threatCategoryCounts, datasetCoverage]);

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
    // Only fetch data if user is logged in
    if (!user?.token) {
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const windowStart = isTrackingLive
        ? (trackingStartedAt || new Date())
        : new Date(Date.now() - HISTORY_WINDOW_HOURS * 60 * 60 * 1000);

      if (isTrackingLive && !trackingStartedAt) {
        setTrackingStartedAt(windowStart);
      }

      const [liveRow, alertRows, statsRows, signalRows, historyRows] = await Promise.all([
        isTrackingLive ? fetchLiveTraffic() : Promise.resolve(null),
        fetchAlerts(),
        fetchStats(),
        fetchSignalStatus(),
        fetchTraffic({ limit: 'all', from: windowStart.toISOString() }),
      ]);

      setError('');
      const backendAlerts = (alertRows || []).map((alert) => ({
        id: alert._id,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp,
        source: alert.logId?.source || alert.source || 'Unknown',
        destination: alert.logId?.destination || alert.destination || 'Unknown',
        resolved: alert.resolved,
      }));

      setRawAlerts(alertRows || []);
      setRecentAlerts(backendAlerts.slice(0, 10));
      setStatsApi(statsRows || null);
      setSignalStatusApi(signalRows || null);
      const fullHistory = historyRows || [];
      setLogs(fullHistory);
      persistLocalTraffic(fullHistory.slice(0, 200));
      setTrafficSeries(rebuildSeries(fullHistory.slice(0, 300)));

      if (liveRow && liveRow._id !== lastLiveIdRef.current) {
        lastLiveIdRef.current = liveRow._id;

        if (liveRow.status === 'Anomaly') {
          const severity = liveRow.severity || 'Medium';
          const message = liveRow.attackType ? `${liveRow.attackType} detected from ${liveRow.source}` : 'Anomaly detected';
          setRecentAlerts((prev) => {
            const next = [
              { id: liveRow._id, message, severity, timestamp: new Date(), source: liveRow.source, destination: liveRow.destination },
              ...prev,
            ];

            const unique = Array.from(new Map(next.map((item) => [item.id, item])).values());
            return unique.slice(0, 10);
          });
          pushNotification(message, severity);
        }
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
  }, [user?.token, isTrackingLive, trackingStartedAt, persistLocalTraffic, rebuildSeries]);

  const runSimulation = useCallback(async (type) => {
    await simulateTraffic(type);
    await refreshData({ silent: false });
  }, [refreshData]);

  useEffect(() => {
    if (user?.token) {
      refreshData({ silent: false });
    }
  }, [user?.token, refreshData]);

  useEffect(() => {
    if (!user?.token || !isTrackingLive) return; // Don't set interval if not logged in or tracking paused

    const timer = setInterval(() => {
      refreshData();
    }, Math.max(1, Number(settings.refreshInterval) || 5) * 1000);

    return () => clearInterval(timer);
  }, [user?.token, refreshData, settings.refreshInterval, isTrackingLive]);

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

  const toggleTracking = useCallback((next) => {
    setIsTrackingLive((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : Boolean(next);

      if (resolved && !prev) {
        setTrackingStartedAt(new Date());
      }

      if (!resolved && prev) {
        setTrackingStartedAt(null);
      }

      return resolved;
    });
  }, []);

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
    setIsTrackingLive: toggleTracking,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
