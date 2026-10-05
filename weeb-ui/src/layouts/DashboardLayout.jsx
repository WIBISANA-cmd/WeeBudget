import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from '../components/layout/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import { PageLoader } from '../components/feedback/LoadingSkeleton';

export default function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-dvh bg-bg-base text-text-body transition-colors duration-200">
      <Sidebar isOpen={isSidebarOpen} close={() => setSidebarOpen(false)} />

      <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col overflow-x-clip">
        <Navbar toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />

        {/* A thin, even gutter: content runs the full width instead of floating in a centered column. */}
        <main className="flex-1 px-3 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-3 md:px-4 md:pb-4 md:pt-4">
          {/* Keyed by path: each page lifts into place as it arrives instead of snapping in. */}
          <div key={pathname} className="page-enter flex w-full flex-col gap-3 md:gap-4">
            {/* The shell stays put while a page chunk downloads; only the content area skeletons. */}
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
