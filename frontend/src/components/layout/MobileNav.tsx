import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const items = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'POS', path: '/pos', icon: ShoppingCart },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Customers', path: '/customers', icon: Users },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '64px',
      backgroundColor: 'var(--bg-card)',
      borderTop: '1px solid var(--border)',
      display: 'none', // Shown in CSS media queries on small screens
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 100,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
      paddingBottom: 'safe-area-inset-bottom',
    }} className="mobile-nav-bar">
      {items.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
            textDecoration: 'none',
            flex: 1,
            height: '100%',
          })}
        >
          {({ isActive }) => (
            <>
              <item.icon size={20} style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }} />
              <span>{item.name}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
