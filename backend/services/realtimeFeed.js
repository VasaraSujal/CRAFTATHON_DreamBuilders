const fs = require('fs');
const path = require('path');
const { processTraffic } = require('./trafficService');

const datasetPath = path.join(__dirname, '..', 'data', 'realtimeTrafficDataset.json');
let dataset = [];
let cursor = 0;
let tick = 0;

try {
  const raw = fs.readFileSync(datasetPath, 'utf8');
  dataset = JSON.parse(raw);
} catch (error) {
  console.warn('Realtime dataset not available, falling back to empty stream:', error.message);
  dataset = [];
}

function nextTrafficSample() {
  if (!dataset.length) {
    return {
      source: '10.0.0.1',
      destination: '10.0.0.2',
      protocol: 'TCP',
      packetSize: 300,
      duration: 0.4,
      frequency: 2,
    };
  }

  const sample = dataset[cursor % dataset.length];
  cursor += 1;
  return sample;
}

function buildNormalSample(baseSample = {}) {
  const protocolPool = ['TCP', 'UDP'];
  return {
    source: baseSample.source || `10.0.0.${10 + (tick % 25)}`,
    destination: baseSample.destination || '10.0.1.1',
    protocol: protocolPool[tick % protocolPool.length],
    packetSize: 120 + (tick % 10) * 35,
    duration: 0.2 + (tick % 4) * 0.15,
    frequency: 1 + (tick % 4),
    datasetSource: baseSample.datasetSource || 'RealtimeStream',
  };
}

async function generateRealtimeTraffic(options = {}) {
  const sample = nextTrafficSample();
  const shouldInjectNormal = tick % 3 === 0;
  tick += 1;

  const candidate = shouldInjectNormal ? buildNormalSample(sample) : sample;

  return processTraffic(candidate, {
    sourceType: 'dataset',
    modelType: options.modelType || 'isolation',
    datasetSource: options.datasetSource || sample.datasetSource || 'RealtimeStream',
    forceStatus: shouldInjectNormal ? 'Normal' : undefined,
  });
}

module.exports = { generateRealtimeTraffic };
