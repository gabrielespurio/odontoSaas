// Production API utilities for reliable data fetching
import { PRODUCTION_CONFIG } from "@/config/production";

// Enhanced API client for production with better error handling
export class ProductionApiClient {
  private baseUrl: string;
  private retryAttempts: number;
  private retryDelay: number;

  constructor() {
    this.baseUrl = PRODUCTION_CONFIG.apiBaseUrl;
    this.retryAttempts = PRODUCTION_CONFIG.retryAttempts;
    this.retryDelay = PRODUCTION_CONFIG.retryDelay;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async fetchWithRetry(
    url: string, 
    options: RequestInit = {},
    attempt: number = 1
  ): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    
    try {
      console.log(`[API] Attempt ${attempt}: ${options.method || 'GET'} ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
        credentials: 'include',
      });

      console.log(`[API] Response ${attempt}: ${response.status} ${response.statusText}`);
      
      // If successful or client error (4xx), return response
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // For server errors (5xx), retry
      if (response.status >= 500 && attempt < this.retryAttempts) {
        console.warn(`[API] Server error ${response.status}, retrying in ${this.retryDelay}ms...`);
        await this.sleep(this.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      
      return response;
    } catch (error) {
      console.error(`[API] Network error on attempt ${attempt}:`, error);
      
      if (attempt < this.retryAttempts) {
        console.warn(`[API] Retrying in ${this.retryDelay}ms...`);
        await this.sleep(this.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      
      throw error;
    }
  }

  // GET request with retry logic
  async get<T>(url: string): Promise<T> {
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    
    if (!response.ok) {
      const errorData = await this.handleErrorResponse(response);
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  }

  // POST request with retry logic
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorData = await this.handleErrorResponse(response);
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  }

  // PUT request with retry logic
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.fetchWithRetry(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorData = await this.handleErrorResponse(response);
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  }

  // DELETE request with retry logic
  async delete<T>(url: string): Promise<T> {
    const response = await this.fetchWithRetry(url, { method: 'DELETE' });
    
    if (!response.ok) {
      const errorData = await this.handleErrorResponse(response);
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  }

  private async handleErrorResponse(response: Response): Promise<any> {
    try {
      const text = await response.text();
      return JSON.parse(text);
    } catch {
      return { message: response.statusText };
    }
  }
}

// Global instance for use throughout the app
export const productionApi = new ProductionApiClient();