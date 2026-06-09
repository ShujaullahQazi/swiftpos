import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { PosPage } from './features/pos/PosPage';
import { ProductsPage } from './features/products/ProductsPage';
import { CustomersPage } from './features/customers/CustomersPage';
import { Loader } from 'lucide-react';

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
                <Route index element={<DashboardPage />} />
                <Route path="pos" element={<PosPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="customers" element={<CustomersPage />} />
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
