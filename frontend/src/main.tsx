import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

// Global cache: data is considered fresh for 30s, stays in memory for 5min
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 seconds — don't refetch if data is fresh
      gcTime:    5 * 60 * 1000,    // 5 minutes — keep inactive data in cache
      retry: 1,                    // only retry once on failure
      refetchOnWindowFocus: false, // POS terminal doesn't need window-focus refetches
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
