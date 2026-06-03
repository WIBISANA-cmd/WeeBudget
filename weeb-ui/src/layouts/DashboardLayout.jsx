import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MobileBottomNav from './components/MobileBottomNav';

export default function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-bg-base text-text-body overflow-hidden transition-colors duration-200">
      <Sidebar isOpen={isSidebarOpen} close={() => setSidebarOpen(false)} />
      
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 relative">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary-500/5 to-transparent pointer-events-none" />
          
          <div className="mx-auto max-w-7xl relative z-10">
            <Outlet />
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
