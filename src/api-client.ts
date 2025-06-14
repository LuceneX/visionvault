/**
 * API client for interacting with the ref-punk database API
 */
import type { Env } from '../types';

// Define types for API responses
interface ApiResponse<T> {
  status: number;
  data: T;
  error?: string;
}

// Types for user data
export interface UserData {
  id: string;
  full_name: string;
  email: string;
  user_type: string;
  password?: string;
  api_key?: string;
  subscription_type?: string;
  rate_limit?: number;
  allow_report?: boolean;
}

// Base API class
class ApiClient {
  constructor(private env: Env) {}

  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    data?: any,
    override?: string
  ): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        'Authorization': `Bearer ${this.env.REF_PUNK_API_TOKEN}`,
        'Content-Type': 'application/json',
      };

      if (override) {
        headers['X-HTTP-Method-Override'] = override;
      }

      const requestOptions: RequestInit = {
        method,
        headers,
      };

      if (data) {
        requestOptions.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.env.REF_PUNK_URL}${endpoint}`, requestOptions);
      const responseData = await response.json() as any;

      return {
        status: response.status,
        data: responseData as T,
        error: responseData.error,
      };
    } catch (error: any) {
      console.error(`API request error: ${error.message}`);
      return {
        status: 500,
        data: null as any,
        error: error.message,
      };
    }
  }

  // User endpoints
  async getUser(userId?: string, email?: string): Promise<ApiResponse<UserData[]>> {
    let endpoint = '/api/db/users';
    const params = new URLSearchParams();
    
    if (userId) {
      params.append('id', userId);
    }
    
    if (email) {
      params.append('email', email);
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return this.request<UserData[]>(endpoint);
  }

  async createUser(userData: UserData): Promise<ApiResponse<{ id: string; api_key: string }>> {
    return this.request<{ id: string; api_key: string }>('/api/db/users', 'POST', userData);
  }

  async updateUser(userData: Partial<UserData> & { id: string }): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/db/users', 'POST', userData, 'PUT');
  }

  async deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/db/users?id=${userId}`, 'DELETE');
  }

  // XHashPass endpoints
  async getXHashPass(userId?: string, apiKey?: string): Promise<ApiResponse<any[]>> {
    let endpoint = '/api/db/xhashpass';
    const params = new URLSearchParams();
    
    if (userId) {
      params.append('userId', userId);
    }
    
    if (apiKey) {
      params.append('apiKey', apiKey);
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return this.request<any[]>(endpoint);
  }

  async updateXHashPass(data: any): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/db/xhashpass', 'POST', data, 'PUT');
  }
}

export function createApiClient(env: Env): ApiClient {
  return new ApiClient(env);
}
