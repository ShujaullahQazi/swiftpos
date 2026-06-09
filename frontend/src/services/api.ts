import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor: Inject Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('swiftpos_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global Error Handler
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // If unauthorized, redirect to login page (unless already on it)
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('swiftpos_token');
      localStorage.removeItem('swiftpos_user');
      window.location.href = '/login';
    }

    // Extract message for Toast
    const data = error.response?.data as any;
    const errorMessage = data?.error || data?.message || 'Something went wrong. Please try again.';

    // Return a standardized error object to the calling function
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      errors: data?.errors || null,
      originalError: error,
    });
  }
);

export default api;
