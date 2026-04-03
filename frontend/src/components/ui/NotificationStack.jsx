import React from 'react';
import { useAppData } from '../../context/AppDataContext.jsx';

function cls(severity) {
  if (severity === 'High') return 'high';
  if (severity === 'Medium') return 'medium';
  return 'low';
}

export default function NotificationStack() {
  const { notifications } = useAppData();

  return (
    <div className="notif-stack">
      {notifications.map((item) => (
        <div key={item.id} className={`notif-item ${cls(item.severity)}`}>
          <p><strong>{item.severity} Alert</strong></p>
          <p>{item.message}</p>
        </div>
      ))}
    </div>
  );
}
