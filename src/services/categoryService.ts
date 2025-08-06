import api from './api';

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  workflow_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryRequest {
  name: string;
  description: string;
  color: string;
  icon: string;
}

export interface UpdateCategoryRequest extends CreateCategoryRequest {
  id: string;
}

export const categoryService = {
  // Get all categories
  async getCategories(): Promise<{ categories: Category[] }> {
    const response = await api.get('/categories');
    return response.data;
  },

  // Get category by ID
  async getCategory(categoryId: string): Promise<Category> {
    const response = await api.get(`/categories/${categoryId}`);
    return response.data;
  },

  // Create new category
  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    const response = await api.post('/categories', data);
    return response.data;
  },

  // Update existing category
  async updateCategory(categoryId: string, data: CreateCategoryRequest): Promise<Category> {
    const response = await api.put(`/categories/${categoryId}`, data);
    return response.data;
  },

  // Delete category
  async deleteCategory(categoryId: string): Promise<void> {
    await api.delete(`/categories/${categoryId}`);
  },

  // Get workflows by category
  async getWorkflowsByCategory(categoryId: string): Promise<{ workflows: any[] }> {
    const response = await api.get(`/categories/${categoryId}/workflows`);
    return response.data;
  },

  // Assign workflow to category
  async assignWorkflowToCategory(categoryId: string, workflowId: string): Promise<void> {
    const response = await api.post(`/categories/${categoryId}/workflows`, {
      workflow_id: workflowId
    });
    return response.data;
  },

  // Remove workflow from category
  async removeWorkflowFromCategory(categoryId: string, workflowId: string): Promise<void> {
    await api.delete(`/categories/${categoryId}/workflows/${workflowId}`);
  }
};