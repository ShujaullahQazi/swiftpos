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

  let hours = time.getHours();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');
  const timeDigits = `${hours}:${minutes}:${seconds}`;

  const formattedDate = time.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em' }}>
            SwiftPOS
          </h2>
        </div>
      </div>

      {/* Right: Date/Time & Network Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Network Status */}
        <div className="topbar-online-status" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--success-text)', fontWeight: 600 }}>
          <Wifi size={16} />
          <span>Online</span>
        </div>

        {/* Live Clock */}
        <div
          className="topbar-clock"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--bg-hover)',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <Calendar size={14} className="topbar-clock-icon" />
          <div className="topbar-clock-text">
            <span className="topbar-time">
              <span className="topbar-time-digits">{timeDigits}</span>
              <span className="topbar-time-ampm">{ampm}</span>
            </span>
            <span className="topbar-date">
              {formattedDate}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
