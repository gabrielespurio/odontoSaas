import { useEffect } from 'react';

export function useTokenCleanup() {
  useEffect(() => {
    const checkAndCleanExpiredToken = () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        // Parse JWT payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();

        // If token is expired, clean up and force login
        if (exp < now) {
          console.log('Token expired, cleaning up...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('needsPasswordChange');
          // Force full page reload to clear any cached state
          window.location.replace('/login');
        }
      } catch (error) {
        // Invalid token format, clean up
        console.log('Invalid token format, cleaning up...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('needsPasswordChange');
        // Force full page reload to clear any cached state
        window.location.replace('/login');
      }
    };

    // Check immediately
    checkAndCleanExpiredToken();

    // Check every 30 seconds
    const interval = setInterval(checkAndCleanExpiredToken, 30000);

    return () => clearInterval(interval);
  }, []);
}