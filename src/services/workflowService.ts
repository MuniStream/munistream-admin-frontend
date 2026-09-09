import type {
  Workflow,
  WorkflowInstance,
  PerformanceMetrics,
  BottleneckAnalysis,
  WorkflowAnalytics
} from '@/types/workflow';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}`;

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('kc_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Re-export types for convenience
export type {
  Workflow,
  WorkflowInstance,
  PerformanceMetrics,
  BottleneckAnalysis,
  WorkflowAnalytics
} from '@/types/workflow';

export const workflowService = {
  // Get all available workflows
  async getWorkflows(): Promise<{ workflows: Workflow[] }> {
    const response = await fetch(`${API_BASE_URL}/workflows/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflows');
    }

    return await response.json();
  },

  // Get workflow details with steps
  async getWorkflowDetails(workflowId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow details');
    }

    return await response.json();
  },

  // Get workflow instances (citizen progress tracking)
  async getWorkflowInstances(params?: {
    workflow_id?: string;
    status?: string;
    user_id?: string;
    instance_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ instances: WorkflowInstance[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/instances?${searchParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow instances');
    }

    return await response.json();
  },

  // Get specific workflow instance
  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstance> {
    const response = await fetch(`${API_BASE_URL}/instances/${instanceId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow instance');
    }

    return await response.json();
  },

  // Get performance metrics for a workflow
  async getWorkflowMetrics(workflowId: string): Promise<PerformanceMetrics[]> {
    const response = await fetch(`${API_BASE_URL}/performance/workflows/${workflowId}/metrics`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow metrics');
    }

    const data = await response.json();
    return data.metrics;
  },

  // Get consolidated per-workflow analytics (KPIs, bottlenecks, status, volume)
  async getWorkflowAnalytics(
    workflowId: string,
    params?: { days?: number; stuckThresholdHours?: number }
  ): Promise<WorkflowAnalytics> {
    const query = new URLSearchParams();
    if (params?.days != null) query.set('days', String(params.days));
    if (params?.stuckThresholdHours != null) query.set('stuck_threshold_hours', String(params.stuckThresholdHours));
    const qs = query.toString();
    const response = await fetch(
      `${API_BASE_URL}/performance/workflows/${workflowId}/analytics${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch workflow analytics');
    }

    return await response.json();
  },

  // Get bottleneck analysis
  async getBottleneckAnalysis(workflowId: string): Promise<BottleneckAnalysis> {
    const response = await fetch(`${API_BASE_URL}/performance/workflows/${workflowId}/bottlenecks`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch bottleneck analysis');
    }

    return await response.json();
  },

  // Get step metrics
  async getStepMetrics(stepId: string): Promise<PerformanceMetrics> {
    const response = await fetch(`${API_BASE_URL}/performance/steps/${stepId}/metrics`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch step metrics');
    }

    return await response.json();
  },

  // Execute a specific step manually (for testing)
  async executeStep(stepId: string, inputs: Record<string, any>): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/performance/steps/${stepId}/execute`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ inputs }),
    });

    if (!response.ok) {
      throw new Error('Failed to execute step');
    }

    return await response.json();
  },

  // Start a new workflow instance
  async startWorkflow(workflowId: string, context: Record<string, any>): Promise<WorkflowInstance> {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      throw new Error('Failed to start workflow');
    }

    return await response.json();
  },

  // Get workflow execution history
  async getWorkflowHistory(params?: {
    workflow_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/performance/history?${searchParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow history');
    }

    const data = await response.json();
    return data.history;
  },

  // Get real-time workflow stats
  async getWorkflowStats(): Promise<{
    total_instances: number;
    active_instances: number;
    completed_today: number;
    avg_completion_time_hours: number;
    success_rate: number;
    by_workflow: Record<string, number>;
    by_status: Record<string, number>;
  }> {
    const response = await fetch(`${API_BASE_URL}/performance/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow stats');
    }

    return await response.json();
  },

  // WORKFLOW CRUD OPERATIONS

  // Create new workflow
  async createWorkflow(data: {
    workflow_id: string;
    name: string;
    description?: string;
    version: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/workflows`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create workflow');
    }

    return await response.json();
  },

  // Update existing workflow
  async updateWorkflow(workflowId: string, data: {
    name?: string;
    description?: string;
    status?: 'draft' | 'active' | 'inactive' | 'archived';
    metadata?: Record<string, any>;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update workflow');
    }

    return await response.json();
  },

  // Delete workflow
  async deleteWorkflow(workflowId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete workflow');
    }
  },

  // NEW INSTANCE TRACKING METHODS

  // Get detailed progress for a specific instance
  async getInstanceProgress(instanceId: string): Promise<{
    instance_id: string;
    workflow_id: string;
    progress_percentage: number;
    total_steps: number;
    completed_steps: number;
    failed_steps: number;
    pending_steps: number;
    current_step: string | null;
    status: string;
    total_duration_seconds: number;
    started_at: string;
    updated_at: string;
    completed_at: string | null;
    current_bottleneck: any;
    pending_approvals_count: number;
    estimated_completion: string | null;
  }> {
    const response = await fetch(`${API_BASE_URL}/instances/${instanceId}/progress`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch instance progress');
    }

    return await response.json();
  },

  // Get all active instances
  async getActiveInstances(): Promise<{
    active_instances: Array<{
      instance_id: string;
      workflow_id: string;
      workflow_name: string;
      user_id: string;
      status: string;
      current_step: string | null;
      progress_percentage: number;
      started_at: string;
      updated_at: string;
      pending_approvals: number;
    }>;
    total_active: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/instances/active`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch active instances');
    }

    return await response.json();
  },

  // Get bottleneck analysis across all workflows
  async getSystemBottlenecks(): Promise<{
    bottlenecks: Array<{
      step_id: string;
      total_executions: number;
      avg_duration: number;
      failure_rate: number;
      failed_executions: number;
    }>;
    stuck_instances: Array<{
      instance_id: string;
      workflow_name: string;
      current_step: string;
      stuck_duration: number;
      user_id: string;
    }>;
    analysis_period_days: number;
    total_executions_analyzed: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/instances/analytics/bottlenecks`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch system bottlenecks');
    }

    return await response.json();
  },

  // Get instance execution history
  async getInstanceHistory(instanceId: string): Promise<{
    instance_id: string;
    workflow_id: string;
    history: Array<{
      step_id: string;
      execution_id: string;
      status: string;
      started_at: string | null;
      completed_at: string | null;
      duration_seconds: number | null;
      inputs: Record<string, any>;
      outputs: Record<string, any>;
      error_message: string | null;
      retry_count: number;
    }>;
    current_step: string | null;
    overall_status: string;
    completed_steps: string[];
    failed_steps: string[];
    pending_approvals: string[];
  }> {
    const response = await fetch(`${API_BASE_URL}/instances/${instanceId}/history`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch instance history');
    }

    return await response.json();
  },

  // ASSIGNMENT / INBOX METHODS

  // Get instances assigned to current user
  async getAssignedInstances(params?: {
    status?: string;
    search?: string;
    limit?: number;
    skip?: number;
  }): Promise<{
    assignments: Array<{
      instance_id: string;
      workflow_id: string;
      workflow_type: string;
      workflow_name: string;
      status: string;
      assigned_to_user: string | null;
      assigned_to_team: string | null;
      assigned_at: string | null;
      assigned_by: string | null;
      parent_instance_id: string | null;
      parent_workflow_id: string | null;
      priority: string;
      created_at: string;
      updated_at: string;
      citizen_email: string | null;
      current_step: string | null;
      completion_percentage: number;
    }>;
    total: number;
    page: number;
    page_size: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/assignments/?${searchParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch assigned instances');
    }

    return await response.json();
  },

  // Start an assigned workflow
  async startAssignedWorkflow(instanceId: string, initialData?: Record<string, any>, notes?: string): Promise<{
    instance_id: string;
    status: string;
    started_at: string;
    started_by: string;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/instances/${instanceId}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        initial_data: initialData || {},
        notes: notes || ''
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start assigned workflow');
    }

    return await response.json();
  },

  // Start a workflow on behalf of another user (admin/manager only)
  async startWorkflowOnBehalf(workflowId: string, userId: string, context?: Record<string, any>): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/instances/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        workflow_id: workflowId,
        on_behalf_of_user_id: userId,
        initial_context: context || {},
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to start workflow on behalf of user');
    }

    return await response.json();
  },

  // Submit workflow instance data (form submissions, signatures, etc.)
  async submitInstanceData(instanceId: string, data: Record<string, any>): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/instances/${instanceId}/submit-data`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to submit instance data');
    }

    return await response.json();
  }
};

export default workflowService;