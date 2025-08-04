import api from './api';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: 'admin' | 'manager' | 'reviewer' | 'approver' | 'viewer';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  permissions: string[];
  department?: string;
  phone?: string;
  avatar_url?: string;
  email_notifications: boolean;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'munistream_access_token';
  private readonly REFRESH_TOKEN_KEY = 'munistream_refresh_token';
  private readonly USER_KEY = 'munistream_user';

  async login(username: string, password: string, rememberMe: boolean = false): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        username,
        password,
        remember_me: rememberMe,
      });

      // Store tokens and user data
      this.setTokens(response.data.access_token, response.data.refresh_token);
      this.setUser(response.data.user);

      // Set auth header for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  async logoutAll(): Promise<void> {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      console.error('Logout all error:', error);
    } finally {
      this.clearAuth();
    }
  }

  async refreshToken(): Promise<TokenResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.post<TokenResponse>('/auth/refresh', {
        refresh_token: refreshToken,
      });

      // Update access token
      this.setAccessToken(response.data.access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;

      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuth();
      throw error;
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<User>('/auth/me');
      this.setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await api.put<User>('/auth/me', data);
      this.setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      // Password change requires re-login
      this.clearAuth();
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Token management
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  setAccessToken(accessToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  // User management
  setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Auth state
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  hasPermission(permission: string): boolean {
    const user = this.getUser();
    return user?.permissions.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getUser();
    return roles.includes(user?.role || '');
  }

  clearAuth(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    delete api.defaults.headers.common['Authorization'];
  }

  // Initialize auth from stored tokens
  initializeAuth(): void {
    const accessToken = this.getAccessToken();
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }
  }
}

export default new AuthService();