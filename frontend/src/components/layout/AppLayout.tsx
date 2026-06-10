import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export const AppLayout: React.FC = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
      {/* Sidebar - Hidden on mobile via CSS */}
      <Sidebar />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: 0,        /* ← prevents flex child from expanding past viewport */
        overflowX: 'clip',  /* ← clips horizontal overflow without breaking vertical sticky positioning */
      }}>
        {/* Dynamic Route Content */}
        <main
          className="page-content animate-fade-in"
          style={{
            flex: 1,
            padding: '16px',
            marginLeft: 'var(--sidebar-width)', // Responsive, overridden to 0 on mobile in index.css
            transition: 'margin-left 0.2s ease',
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Bottom Nav Bar - Visible on mobile only via CSS */}
      <MobileNav />
    </div>
  );
};
