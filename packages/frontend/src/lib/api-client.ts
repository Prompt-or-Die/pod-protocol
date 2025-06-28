// Real API Client - connects to the actual API server
// Replaces the mock implementation with real HTTP calls

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;
  private authToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    // Load existing tokens from localStorage
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage() {
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('pod_auth_token');
      this.refreshToken = localStorage.getItem('pod_refresh_token');
    }
  }

  private saveTokensToStorage() {
    if (typeof window !== 'undefined') {
      if (this.authToken) {
        localStorage.setItem('pod_auth_token', this.authToken);
      } else {
        localStorage.removeItem('pod_auth_token');
      }
      
      if (this.refreshToken) {
        localStorage.setItem('pod_refresh_token', this.refreshToken);
      } else {
        localStorage.removeItem('pod_refresh_token');
      }
    }
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
    this.saveTokensToStorage();
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
    this.saveTokensToStorage();
  }

  clearTokens() {
    this.authToken = null;
    this.refreshToken = null;
    this.saveTokensToStorage();
  }

  private async refreshAuthToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setAuthToken(data.accessToken);
        return true;
      } else {
        // Refresh token is invalid, clear all tokens
        this.clearTokens();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && retryOnAuth && this.refreshToken) {
        const refreshed = await this.refreshAuthToken();
        if (refreshed) {
          // Retry the request with new token
          return this.request<T>(endpoint, options, false);
        }
      }
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Health check
  async health() {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // Authentication methods
  async getNonce(publicKey: string) {
    return this.request<{ nonce: string; message: string; expiresAt: string }>(`/api/auth/nonce/${publicKey}`);
  }

  async login(publicKey: string, signature: string, message: string) {
    const response = await this.request<{
      message: string;
      accessToken: string;
      refreshToken: string;
      user: any;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ publicKey, signature, message }),
    });

    // Store tokens
    this.setAuthToken(response.accessToken);
    this.setRefreshToken(response.refreshToken);

    return response;
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear tokens on logout
      this.clearTokens();
    }
  }

  async getCurrentUser() {
    return this.request('/api/auth/me');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  // Agent operations
  async registerAgent(params: {
    name: string;
    capabilities: string[];
    metadataUri: string;
    isPublic: boolean;
  }) {
    return this.request<{ signature: string; agentAddress: string }>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getAgent(address: string) {
    return this.request(`/api/agents/${address}`);
  }

  async listAgents(filters?: unknown) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return this.request(`/api/agents${queryString ? `?${queryString}` : ''}`);
  }

  async searchAgents(query: string, filters?: unknown) {
    return this.request('/api/agents/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters }),
    });
  }

  // Channel operations
  async createChannel(params: {
    name: string;
    description: string;
    visibility: 'public' | 'private';
    maxParticipants: number;
    feePerMessage: number;
  }) {
    return this.request<{ signature: string; channelAddress: string }>('/api/channels', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getChannel(address: string) {
    return this.request(`/api/channels/${address}`);
  }

  async listChannels(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return this.request(`/api/channels${queryString ? `?${queryString}` : ''}`);
  }

  async searchChannels(query: string, filters?: any) {
    return this.request('/api/channels/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters }),
    });
  }

  async joinChannel(channelAddress: string) {
    return this.request(`/api/channels/${channelAddress}/join`, {
      method: 'POST',
    });
  }

  async leaveChannel(channelAddress: string) {
    return this.request(`/api/channels/${channelAddress}/leave`, {
      method: 'POST',
    });
  }

  // Message operations
  async sendMessage(params: {
    recipient: string;
    content: string;
    channelId?: string;
    encrypted?: boolean;
  }) {
    return this.request<{ signature: string; messageId: string }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getMessage(messageId: string) {
    return this.request(`/api/messages/${messageId}`);
  }

  async listMessages(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return this.request(`/api/messages${queryString ? `?${queryString}` : ''}`);
  }

  // Analytics operations
  async getAnalyticsDashboard() {
    return this.request('/api/analytics/dashboard');
  }

  async getAgentAnalytics(agentAddress: string) {
    return this.request(`/api/analytics/agents/${agentAddress}`);
  }

  async getNetworkAnalytics() {
    return this.request('/api/analytics/network');
  }

  async getChannelAnalytics(channelAddress: string) {
    return this.request(`/api/analytics/channels/${channelAddress}`);
  }
}

export default ApiClient;
export { ApiClient };
export type { ApiResponse }; 