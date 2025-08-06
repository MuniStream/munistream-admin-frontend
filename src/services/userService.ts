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
  team_ids?: string[];
  primary_team_id?: string;
  max_concurrent_tasks?: number;
  specializations?: string[];
  availability_status?: string;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role: 'admin' | 'manager' | 'reviewer' | 'approver' | 'viewer';
  department?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  role?: 'admin' | 'manager' | 'reviewer' | 'approver' | 'viewer';
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  department?: string;
  phone?: string;
  email_notifications?: boolean;
  permissions?: string[];
}

export const userService = {
  // Get all users
  async getUsers(params?: {
    skip?: number;
    limit?: number;
    role?: string;
    status?: string;
  }): Promise<User[]> {
    const response = await api.get('/auth/users', { params });
    return response.data;
  },

  // Get user by ID
  async getUser(userId: string): Promise<User> {
    const response = await api.get(`/auth/users/${userId}`);
    return response.data;
  },

  // Create new user
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await api.post('/auth/users', data);
    return response.data;
  },

  // Update existing user
  async updateUser(userId: string, data: UpdateUserRequest): Promise<User> {
    const response = await api.put(`/auth/users/${userId}`, data);
    return response.data;
  },

  // Delete user
  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/auth/users/${userId}`);
  },

  // Get available permissions
  async getPermissions(): Promise<string[]> {
    const response = await api.get('/auth/permissions');
    return response.data;
  },

  // Get available roles
  async getRoles(): Promise<string[]> {
    const response = await api.get('/auth/roles');
    return response.data;
  }
};