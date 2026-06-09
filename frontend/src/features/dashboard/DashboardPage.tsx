import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Stats {
  today_sales: number;
  today_orders_count: number;
  yesterday_sales: number;
  sales_change_percent: number;
  active_products_count: number;
  low_stock_count: number;
  monthly_sales: number;
}

interface ChartDataPoint {
  date: string;
  sales: number;
  orders: number;
}

interface TopProduct {
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
}

interface LowStockProduct {
  id: number;
  name: string;
  sku: string;
  stock_quantity: number;
  category: { name: string };
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // ─── Cached queries — 60s staleTime so analytics auto-refresh silently in background ───
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => { const r = await api.get('/dashboard/stats'); return r.data; },
    staleTime: 60 * 1000,
  });

  const { data: chartData = [], isLoading: chartLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ['dashboard-chart'],
    queryFn: async () => { const r = await api.get('/dashboard/chart'); return r.data; },
    staleTime: 60 * 1000,
  });

  const { data: topProducts = [], isLoading: topLoading } = useQuery<TopProduct[]>({
    queryKey: ['dashboard-top-products'],
    queryFn: async () => { const r = await api.get('/dashboard/top-products'); return r.data; },
    staleTime: 60 * 1000,
  });

  const { data: lowStock = [], isLoading: lowLoading } = useQuery<LowStockProduct[]>({
    queryKey: ['dashboard-low-stock'],
    queryFn: async () => { const r = await api.get('/dashboard/low-stock'); return r.data; },
    staleTime: 60 * 1000,
  });

  const isLoading = statsLoading || chartLoading || topLoading || lowLoading;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
        <Loader size={36} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading analytics...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
      }}>
        {/* Today's Sales */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <p style={cardLabelStyle}>Today's Revenue</p>
              <h3 style={cardValueStyle}>{formatCurrency(stats?.today_sales || 0)}</h3>
            </div>
            <div style={{ ...iconWrapperStyle, backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={cardFooterStyle}>
            {stats && stats.sales_change_percent >= 0 ? (
              <span style={{ color: 'var(--success-text)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                <TrendingUp size={14} /> +{stats.sales_change_percent}%
              </span>
            ) : (
              <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                <TrendingDown size={14} /> {stats?.sales_change_percent}%
              </span>
            )}
            <span style={{ color: 'var(--text-muted)' }}> vs. yesterday</span>
          </div>
        </div>

        {/* Today's Orders */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <p style={cardLabelStyle}>Orders Executed</p>
              <h3 style={cardValueStyle}>{stats?.today_orders_count || 0}</h3>
            </div>
            <div style={{ ...iconWrapperStyle, backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
              <ShoppingCartIcon />
            </div>
          </div>
          <div style={cardFooterStyle}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Active shift</span>
            <span style={{ color: 'var(--text-muted)' }}> transaction count</span>
          </div>
        </div>

        {/* Monthly Sales */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <p style={cardLabelStyle}>Monthly Revenue</p>
              <h3 style={cardValueStyle}>{formatCurrency(stats?.monthly_sales || 0)}</h3>
            </div>
            <div style={{ ...iconWrapperStyle, backgroundColor: 'var(--success-light)', color: 'var(--success-text)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={cardFooterStyle}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>June sales cycle</span>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          style={{ ...cardStyle, cursor: stats?.low_stock_count ? 'pointer' : 'default' }}
          onClick={() => stats?.low_stock_count && navigate('/products?filter=low-stock')}
        >
          <div style={cardHeaderStyle}>
            <div>
              <p style={cardLabelStyle}>Low Stock Alerts</p>
              <h3 style={{ ...cardValueStyle, color: stats?.low_stock_count ? 'var(--danger)' : 'var(--text-primary)' }}>
                {stats?.low_stock_count || 0}
              </h3>
            </div>
            <div style={{
              ...iconWrapperStyle,
              backgroundColor: stats?.low_stock_count ? 'var(--danger-light)' : 'var(--bg-hover)',
              color: stats?.low_stock_count ? 'var(--danger)' : 'var(--text-muted)',
            }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={cardFooterStyle}>
            {stats?.low_stock_count ? (
              <span style={{ color: 'var(--danger)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Needs attention <ArrowRight size={12} />
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>All stocks healthy</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Charts & Sales Performance Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
      }} className="dashboard-grid-main">
        {/* Sales Chart */}
        <div style={panelStyle}>
          <h3 style={panelTitleStyle}>Sales Performance (Past 14 Days)</h3>
          <div style={{ width: '100%', height: '320px', marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-md)',
                  }}
                  formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--accent)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products */}
        <div style={panelStyle}>
          <h3 style={panelTitleStyle}>Top 5 Selling Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            {topProducts.length > 0 ? (
              topProducts.map((prod, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prod.name}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{prod.quantity} sold</span>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px' }}>
                    {formatCurrency(prod.revenue)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                No sales records yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Low Stock Widget */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={panelTitleStyle}>Inventory Restock Notices</h3>
          <button onClick={() => navigate('/products')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            View Full Inventory
          </button>
        </div>

        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                <th style={{ padding: '12px 8px' }}>Product Name</th>
                <th style={{ padding: '12px 8px' }}>SKU</th>
                <th style={{ padding: '12px 8px' }}>Category</th>
                <th style={{ padding: '12px 8px' }}>Units Left</th>
                <th style={{ padding: '12px 8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.length > 0 ? (
                lowStock.map((prod) => (
                  <tr key={prod.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>{prod.name}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{prod.sku}</td>
                    <td style={{ padding: '12px 8px' }}>{prod.category?.name}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: prod.stock_quantity === 0 ? 'var(--danger)' : 'var(--warning-text)' }}>
                      {prod.stock_quantity}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className={`badge ${prod.stock_quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                        {prod.stock_quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    All items have healthy inventory levels
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Inline Layout styling helpers
const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '4px',
};

const cardValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  lineHeight: 1,
};

const iconWrapperStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const cardFooterStyle: React.CSSProperties = {
  fontSize: '12px',
  borderTop: '1px solid var(--border)',
  paddingTop: '12px',
};

const panelStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
  padding: '24px',
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
};

// Micro Lucide icons mapping
const ShoppingCartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
  </svg>
);
