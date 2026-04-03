import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import Topbar from '../components/layout/Topbar.jsx';
import NotificationStack from '../components/ui/NotificationStack.jsx';
import { useAppData } from '../context/AppDataContext.jsx';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { stats } = useAppData();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(true);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="app-shell">
      <NotificationStack />
      <div className="app-layout">
        <Sidebar open={open} setOpen={setOpen} />
        <div className="content-area">
          <Topbar onMenu={() => setOpen((v) => !v)} systemStatus={stats.systemStatus} />
          <Outlet />
        </div>
      </div>
    </div>
  );
}
