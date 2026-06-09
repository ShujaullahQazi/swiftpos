import React, { useState, useEffect } from 'react';
import { Menu, Calendar, Wifi } from 'lucide-react';

interface TopBarProps {
  onMenuToggle?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuToggle }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      height: 'var(--header-height)',
      backgroundColor: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 90,
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Left: Mobile Menu Toggle & Brand (Visible on mobile only) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onMenuToggle}
          style={{
            padding: '8px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-hover)',
            display: 'none', // Shown in CSS media queries on small screens
          }}
          className="mobile-menu-btn"
        >
          <Menu size={20} />
        </button>
        
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em' }}>
            SwiftPOS Dashboard
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            General Retail Terminal
          </p>
        </div>
      </div>

      {/* Right: Date/Time & Network Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Network Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--success-text)', fontWeight: 600 }}>
          <Wifi size={16} />
          <span>Online</span>
        </div>

        {/* Live Clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-hover)',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}>
          <Calendar size={14} />
          <span>
            {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span>
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    </header>
  );
};
