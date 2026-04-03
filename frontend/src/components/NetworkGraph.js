import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';

function getNodeId(ip) {
  return `node-${ip.replace(/\./g, '-')}`;
}

export default function NetworkGraph({ traffic = [] }) {
  const { nodes, edges } = useMemo(() => {
    const latest = traffic.slice(0, 30);
    const nodeMap = new Map();
    const edgeMap = new Map();

    latest.forEach((item, index) => {
      const sourceId = getNodeId(item.source);
      const destinationId = getNodeId(item.destination);

      if (!nodeMap.has(sourceId)) {
        nodeMap.set(sourceId, {
          id: sourceId,
          position: { x: 80 + (index % 5) * 220, y: 60 + Math.floor(index / 5) * 110 },
          data: { label: item.source },
          style: {
            background: '#1c2a27',
            color: '#d9ede2',
            border: '1px solid #3ba55d',
            borderRadius: '10px',
            padding: '8px',
          },
        });
      }

      if (!nodeMap.has(destinationId)) {
        nodeMap.set(destinationId, {
          id: destinationId,
          position: { x: 150 + ((index + 2) % 5) * 220, y: 130 + Math.floor((index + 2) / 5) * 110 },
          data: { label: item.destination },
          style: {
            background: '#2b1c1c',
            color: '#f9d8d9',
            border: '1px solid #f15156',
            borderRadius: '10px',
            padding: '8px',
          },
        });
      }

      const edgeId = `${sourceId}-${destinationId}`;
      const existing = edgeMap.get(edgeId);

      if (existing) {
        existing.data.count += 1;
        if (item.status === 'Anomaly') {
          existing.style.stroke = '#f15156';
          existing.animated = true;
        }
      } else {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: sourceId,
          target: destinationId,
          label: item.status,
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: item.status === 'Anomaly',
          style: {
            stroke: item.status === 'Anomaly' ? '#f15156' : '#3ba55d',
            strokeWidth: 2,
          },
          data: { count: 1 },
        });
      }
    });

    const mergedEdges = Array.from(edgeMap.values()).map((edge) => ({
      ...edge,
      label: `${edge.label} x${edge.data.count}`,
    }));

    return {
      nodes: Array.from(nodeMap.values()),
      edges: mergedEdges,
    };
  }, [traffic]);

  return (
    <section className="panel">
      <div className="panel-title-row">
        <h2>Communication Network Graph</h2>
      </div>
      <div className="network-wrapper">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background color="#324740" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  );
}
