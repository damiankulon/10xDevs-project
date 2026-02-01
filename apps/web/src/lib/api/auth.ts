// Direct URL to NestJS backend (CORS is configured in NestJS)
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

interface ApiError {
  message: string;
  statusCode: number;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
}

interface RegisterResponse {
  message: string;
}

interface PasswordResetResponse {
  message: string;
}

interface UpdatePasswordResponse {
  message: string;
}

interface LogoutResponse {
  message: string;
}

class AuthApiClient {
  private getAuthHeaders(includeToken = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeToken) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'Wystąpił nieoczekiwany błąd',
        statusCode: response.status,
      }));
      throw new Error(error.message);
    }

    return response.json();
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Include cookies
    });

    const data = await this.handleResponse<LoginResponse>(response);

    // Store access token in localStorage and cookie
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Set cookie for SSR middleware
    document.cookie = `accessToken=${data.accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

    return data;
  }

  async register(email: string, password: string): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });

    return this.handleResponse<RegisterResponse>(response);
  }

  async logout(): Promise<LogoutResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders(true),
      credentials: 'include', // Include cookies
    });

    const data = await this.handleResponse<LogoutResponse>(response);

    // Clear local storage and cookie
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    document.cookie = 'accessToken=; path=/; max-age=0';

    return data;
  }

  async resetPassword(email: string): Promise<PasswordResetResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/password-reset`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ email }),
    });

    return this.handleResponse<PasswordResetResponse>(response);
  }

  async updatePassword(password: string): Promise<UpdatePasswordResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/update-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(true),
      body: JSON.stringify({ password }),
    });

    return this.handleResponse<UpdatePasswordResponse>(response);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getUser(): { id: string; email: string } | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}

export const authApi = new AuthApiClient();
