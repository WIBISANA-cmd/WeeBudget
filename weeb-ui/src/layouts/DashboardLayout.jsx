import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MobileBottomNav from './components/MobileBottomNav';

export default function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-bg-base text-text-body transition-colors duration-200">
      <Sidebar isOpen={isSidebarOpen} close={() => setSidebarOpen(false)} />
      
      <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
        
        <main className="relative flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-4 sm:px-5 md:px-6 md:pb-8 md:pt-5 lg:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary-500/10 via-primary-500/4 to-transparent" />
          
          <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
            <Outlet />
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
