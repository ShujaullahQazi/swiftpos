import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './features/auth/LoginPage';
import { Loader } from 'lucide-react';

// Lazy-load heavy page chunks — each route only downloads its JS when first visited
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PosPage       = lazy(() => import('./features/pos/PosPage').then(m => ({ default: m.PosPage })));
const ProductsPage  = lazy(() => import('./features/products/ProductsPage').then(m => ({ default: m.ProductsPage })));
const CustomersPage = lazy(() => import('./features/customers/CustomersPage').then(m => ({ default: m.CustomersPage })));

const PageFallback: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
    <Loader size={30} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading...</span>
  </div>
);

// Route Guard for Authenticated Pages
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-page)',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <Loader size={36} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Verifying security keys...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Route Guard for Guest Pages (e.g. Login)
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Guest Login Route */}
              <Route path="/login" element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              } />

              {/* Protected App Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>} />
                <Route path="pos" element={<Suspense fallback={<PageFallback />}><PosPage /></Suspense>} />
                <Route path="products" element={<Suspense fallback={<PageFallback />}><ProductsPage /></Suspense>} />
                <Route path="customers" element={<Suspense fallback={<PageFallback />}><CustomersPage /></Suspense>} />
              </Route>

              {/* Catch-all Redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
