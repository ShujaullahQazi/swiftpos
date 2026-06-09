import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, LogOut, Store } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { logout, user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'POS Terminal', path: '/pos', icon: ShoppingCart },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Customers', path: '/customers', icon: Users },
  ];

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--bg-sidebar)',
      color: 'var(--text-inverse)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-lg)',
    }}>
      {/* Brand Header */}
      <div style={{
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div style={{
          backgroundColor: 'var(--accent)',
          color: 'white',
          padding: '8px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Store size={22} />
        </div>
        <div>
          <h1 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'white',
            letterSpacing: '0.02em',
            lineHeight: 1,
            marginBottom: '4px'
          }}>SwiftPOS</h1>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>v1.0.0</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: 600,
              color: isActive ? 'white' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--accent)' : 'transparent',
              transition: 'all 0.2s ease',
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.style.backgroundColor.includes('var(--accent)')) {
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              }
            }}
            onMouseLeave={(e) => {
              const isActive = e.currentTarget.classList.contains('active');
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <item.icon size={18} />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User Footer Panel */}
      <div style={{
        padding: '20px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            color: 'white',
          }}>
            {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <h4 style={{ fontSize: '13px', color: 'white', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {user?.name || 'POS Agent'}
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cashier</span>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 600,
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ef4444';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#ef4444';
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
