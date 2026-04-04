export function getThreatCategory(log = {}) {
  if (log.threatCategory && log.threatCategory !== 'null' && log.threatCategory !== 'None') {
    return log.threatCategory;
  }

  const jammingRisk = Number(log.jammingRisk ?? -1);
  const spoofingRisk = Number(log.spoofingRisk ?? -1);
  const intrusionRisk = Number(log.intrusionRisk ?? -1);

  if ([jammingRisk, spoofingRisk, intrusionRisk].every((value) => Number.isFinite(value) && value >= 0)) {
    const highRiskCount = [jammingRisk >= 65, spoofingRisk >= 65, intrusionRisk >= 65].filter(Boolean).length;
    if (highRiskCount > 1) return 'Mixed';

    if (jammingRisk >= spoofingRisk && jammingRisk >= intrusionRisk) return 'Jamming';
    if (spoofingRisk >= intrusionRisk) return 'Spoofing';
    return 'Intrusion';
  }

  const attackType = String(log.attackType || '').toLowerCase();
  if (attackType === 'ddos' || attackType === 'jamming') return 'Jamming';
  if (attackType === 'spoofing') return 'Spoofing';
  if (attackType === 'intrusion') return 'Intrusion';
  if (attackType === 'mixed') return 'Mixed';

  const protocol = String(log.protocol || '').toUpperCase();
  if (protocol === 'UDP') return 'Jamming';
  if (protocol === 'ICMP') return 'Spoofing';
  return 'Intrusion';
}

export function getStatusRowClass(status) {
  return status === 'Anomaly' ? 'row-danger' : 'row-safe';
}