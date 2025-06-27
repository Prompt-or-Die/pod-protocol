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

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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