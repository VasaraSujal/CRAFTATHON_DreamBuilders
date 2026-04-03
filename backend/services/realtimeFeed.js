const fs = require('fs');
const path = require('path');
const { processTraffic } = require('./trafficService');

const datasetPath = path.join(__dirname, '..', 'data', 'realtimeTrafficDataset.json');
let dataset = [];
let cursor = 0;

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

async function generateRealtimeTraffic(options = {}) {
  const sample = nextTrafficSample();
  return processTraffic(sample, {
    sourceType: 'dataset',
    modelType: options.modelType || 'isolation',
    datasetSource: options.datasetSource || sample.datasetSource || 'RealtimeStream',
  });
}

module.exports = { generateRealtimeTraffic };
