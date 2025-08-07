// Production configuration for OdontoSync
// This file ensures proper configuration in production environment

export const PRODUCTION_CONFIG = {
  // API Base URL - automatically detect production vs development
  apiBaseUrl: import.meta.env.PROD ? '' : 'http://localhost:5000',
  
  // Enable debug mode in production for troubleshooting
  debugMode: import.meta.env.PROD ? true : true,
  
  // Enhanced error reporting
  detailedErrors: true,
  
  // Request timeout settings
  requestTimeout: 30000,
  
  // Retry settings for failed requests
  retryAttempts: 3,
  retryDelay: 1000,
};

// Enhanced fetch wrapper for production
export async function productionFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const fullUrl = url.startsWith('/') ? `${PRODUCTION_CONFIG.apiBaseUrl}${url}` : url;
  
  // Add default headers
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Add auth token
  const token = localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const requestOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };
  
  if (PRODUCTION_CONFIG.debugMode) {
    console.log('Production fetch:', {
      url: fullUrl,
      method: options.method || 'GET',
      hasToken: !!token,
      headers: Object.fromEntries(headers.entries()),
    });
  }
  
  try {
    const response = await fetch(fullUrl, requestOptions);
    
    if (PRODUCTION_CONFIG.debugMode) {
      console.log('Production response:', {
        url: fullUrl,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });
    }
    
    return response;
  } catch (error) {
    console.error('Production fetch error:', {
      url: fullUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Production-ready error handler
export function handleProductionError(error: unknown, context?: string): void {
  const errorInfo = {
    context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };
  
  console.error('Production error:', errorInfo);
  
  // Send error to server for logging (optional)
  if (PRODUCTION_CONFIG.debugMode && context === 'companies-module') {
    fetch('/api/debug/frontend-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(errorInfo),
    }).catch(() => {
      // Ignore errors in error reporting
    });
  }
}