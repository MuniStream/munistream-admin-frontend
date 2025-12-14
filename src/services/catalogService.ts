const API_BASE_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}`;

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('kc_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export interface SourceConfig {
  connection_string?: string;
  query?: string;
  url?: string;
  file_path?: string;
  uploaded_file_id?: string;
  uploaded_filename?: string;
  file_size_bytes?: number | null;
  delimiter?: string;
  has_header?: boolean;
  sheet_name?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  auth_config?: Record<string, any>;
  refresh_rate_minutes?: number;
  timeout_seconds?: number;
}

export interface ColumnSchema {
  name: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'datetime' | 'json';
  nullable?: boolean;
  description?: string;
  indexed?: boolean;
}

export interface PermissionRule {
  group_id: string;
  can_view: boolean;
  visible_columns?: string[];
  row_filters?: Record<string, any>;
  max_rows?: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl_seconds?: number;
  max_size_mb?: number;
}

export interface CreateCatalogRequest {
  catalog_id: string;
  name: string;
  description?: string;
  source_type: 'sql' | 'csv' | 'json' | 'excel' | 'api';
  source_config: SourceConfig;
  schema?: ColumnSchema[];
  permissions?: PermissionRule[];
  cache_config?: CacheConfig;
  tags?: string[];
}

export interface UpdateCatalogRequest {
  name?: string;
  description?: string;
  source_config?: SourceConfig;
  schema?: ColumnSchema[];
  permissions?: PermissionRule[];
  cache_config?: CacheConfig;
  status?: 'active' | 'inactive' | 'error';
  tags?: string[];
}

export interface Catalog {
  _id: string;
  catalog_id: string;
  name: string;
  description?: string;
  source_type: 'sql' | 'csv' | 'json' | 'excel' | 'api';
  source_config: Record<string, any>;
  schema: ColumnSchema[];
  permissions: PermissionRule[];
  cache_config: CacheConfig;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_sync?: string;
  last_sync_result?: {
    success: boolean;
    rows_synced: number;
    error_message?: string;
    synced_at: string;
    duration_seconds: number;
  };
  status: 'active' | 'inactive' | 'error';
  tags: string[];
}

export interface CatalogStats {
  total_catalogs: number;
  active_catalogs: number;
  inactive_catalogs: number;
  error_catalogs: number;
  total_rows: number;
  last_sync_summary: Record<string, any>;
}

export interface TestConnectionRequest {
  source_type: 'sql' | 'csv' | 'json' | 'excel' | 'api';
  source_config: SourceConfig;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface PreviewDataRequest {
  source_type: 'sql' | 'csv' | 'json' | 'excel' | 'api';
  source_config: SourceConfig;
  limit?: number;
}

export interface PreviewDataResponse {
  success: boolean;
  data: Record<string, any>[];
  inferred_schema: ColumnSchema[];
  message?: string;
  row_count: number;
}

export interface SyncResult {
  success: boolean;
  rows_synced: number;
  error_message?: string;
  synced_at: string;
  duration_seconds: number;
}

export const catalogService = {
  // Get all catalogs
  async getCatalogs(params?: {
    status?: 'active' | 'inactive' | 'error';
    source_type?: 'sql' | 'csv' | 'json' | 'excel' | 'api';
    tags?: string[];
    page?: number;
    page_size?: number;
  }): Promise<{ catalogs: Catalog[]; total_count: number; page: number; page_size: number }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/admin/catalogs/?${searchParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch catalogs');
    }

    return await response.json();
  },

  // Get catalog by ID
  async getCatalog(catalogId: string): Promise<Catalog> {
    const response = await fetch(`${API_BASE_URL}/admin/catalogs/${catalogId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch catalog');
    }

    return await response.json();
  },

  // Create new catalog
  async createCatalog(catalogData: CreateCatalogRequest): Promise<Catalog> {
    const response = await fetch(`${API_BASE_URL}/admin/catalogs/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(catalogData),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to create catalog';
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          // Handle validation errors from backend
          if (Array.isArray(errorData.detail)) {
            // Pydantic validation errors
            const validationErrors = errorData.detail
              .map((err: any) => `${err.loc?.join('.') || 'Field'}: ${err.msg}`)
              .join(', ');
            errorMessage = `Validation error: ${validationErrors}`;
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          }
        }
      } catch {
        // If JSON parsing fails, use default error
        errorMessage = `Failed to create catalog (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  },

  // Update catalog
  async updateCatalog(catalogId: string, catalogData: UpdateCatalogRequest): Promise<Catalog> {
    const response = await fetch(`${API_BASE_URL}/admin/catalogs/${catalogId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(catalogData),
    });

    if (!response.ok) {
      throw new Error('Failed to update catalog');
    }

    return await response.json();
  },

  // Delete catalog
  async deleteCatalog(catalogId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/catalogs/${catalogId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete catalog');
    }
  },

  // Sync catalog data
  async syncCatalog(catalogId: string): Promise<SyncResult> {
    const response = await fetch(`${API_BASE_URL}/admin/catalogs/${catalogId}/sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to sync catalog');
    }

    return await response.json();
  },

  // Update catalog permissions
  async updatePermissions(catalogId: string, permissions: PermissionRule[]): Promise<Catalog> {
    const response = await fetch(`${API_BASE_URL}/admin/catalogs/${catalogId}/permissions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ permissions }),
    });

    if (!response.ok) {
      throw new Error('Failed to update permissions');
    }

    return await response.json();
  },

  // Get catalog statistics
  async getStats(): Promise<CatalogStats> {
    const response = await fetch(`${API_BASE_URL}/admin/catalogs/stats/overview`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch catalog statistics');
    }

    return await response.json();
  },

  // Test connection to data source
  async testConnection(connectionData: TestConnectionRequest): Promise<TestConnectionResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/catalogs/test-connection`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(connectionData),
    });

    if (!response.ok) {
      throw new Error('Failed to test connection');
    }

    return await response.json();
  },

  // Preview data from source
  async previewData(previewData: PreviewDataRequest): Promise<PreviewDataResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/catalogs/preview-data`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(previewData),
    });

    if (!response.ok) {
      throw new Error('Failed to preview data');
    }

    return await response.json();
  },

  // Get catalog data (admin view - no filtering)
  async getCatalogData(
    catalogId: string,
    params?: {
      search?: string;
      filters?: Record<string, any>;
      sort_by?: string;
      sort_desc?: boolean;
      page?: number;
      page_size?: number;
    }
  ): Promise<{
    data: Record<string, any>[];
    total_count: number;
    page: number;
    page_size: number;
    catalog_id: string;
    visible_columns: string[];
  }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'filters' && typeof value === 'object') {
            searchParams.append(key, JSON.stringify(value));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/admin/catalogs/${catalogId}/data?${searchParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch catalog data');
    }

    return await response.json();
  }
};

export default catalogService;