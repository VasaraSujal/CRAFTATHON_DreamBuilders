const { processTraffic } = require('./trafficService');

const generateTraffic = async (isAttack = false, options = {}) => {
    const protocols = ['TCP', 'UDP', 'ICMP'];
    const sources = ['192.168.1.10', '192.168.1.15', '10.0.0.5', '172.16.0.1'];
    const destinations = ['192.168.1.1', '8.8.8.8', '10.0.0.1'];

    const trafficData = {
        source: sources[Math.floor(Math.random() * sources.length)],
        destination: destinations[Math.floor(Math.random() * destinations.length)],
        protocol: protocols[Math.floor(Math.random() * protocols.length)],
        packetSize: isAttack ? Math.floor(Math.random() * 5000) + 2000 : Math.floor(Math.random() * 1000) + 64,
        duration: isAttack ? (Math.random() * 10).toFixed(2) : (Math.random() * 1).toFixed(2),
        frequency: isAttack ? Math.floor(Math.random() * 100) + 50 : Math.floor(Math.random() * 10) + 1,
    };

    return await processTraffic(trafficData, {
        sourceType: options.sourceType || 'simulation',
        modelType: options.modelType || 'isolation',
    });
};

module.exports = { generateTraffic };
