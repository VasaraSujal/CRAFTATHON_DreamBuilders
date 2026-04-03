import React, { useState } from 'react';

export default function SimulationControls({ onSimulate, role }) {
  const [loadingType, setLoadingType] = useState('');
  const canSimulate = role === 'Admin' || role === 'Analyst';

  const run = async (type) => {
    if (!canSimulate) return;
    setLoadingType(type);
    try {
      await onSimulate(type);
    } finally {
      setLoadingType('');
    }
  };

  return (
    <section className="panel simulation-panel">
      <div className="panel-title-row">
        <h2>Attack Simulation Console</h2>
      </div>

      <p>
        Run controlled simulation events to demonstrate real-time anomaly detection.
      </p>

      <div className="sim-actions">
        <button
          className="btn btn-danger"
          disabled={!canSimulate || loadingType === 'attack'}
          onClick={() => run('attack')}
        >
          {loadingType === 'attack' ? 'Simulating...' : 'Simulate Attack (DDoS / Spoofing)'}
        </button>

        <button
          className="btn btn-safe"
          disabled={!canSimulate || loadingType === 'normal'}
          onClick={() => run('normal')}
        >
          {loadingType === 'normal' ? 'Sending...' : 'Generate Normal Traffic'}
        </button>
      </div>

      {!canSimulate ? (
        <p className="role-note">
          Your role is {role || 'Monitor'}: monitoring access only.
        </p>
      ) : null}
    </section>
  );
}
