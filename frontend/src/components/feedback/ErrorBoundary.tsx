import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          margin: '20px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border)',
          textAlign: 'center',
          maxWidth: '500px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          <div style={{
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '16px',
            borderRadius: '50%',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ marginBottom: '10px', fontSize: '20px', fontWeight: 600 }}>Something went wrong</h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            marginBottom: '24px',
            lineHeight: 1.5,
          }}>
            {this.state.error?.message || 'An unexpected error occurred in this section of the application.'}
          </p>
          <button
            onClick={this.handleReset}
            className="btn btn-primary"
            style={{ display: 'inline-flex', gap: '8px' }}
          >
            <RefreshCw size={16} />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
