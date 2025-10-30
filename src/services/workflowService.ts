import type {
  Workflow,
  WorkflowInstance,
  PerformanceMetrics,
  BottleneckAnalysis
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
  BottleneckAnalysis 
} from '@/types/workflow';

export const workflowService = {
  // Get all available workflows
  async getWorkflows(): Promise<{ workflows: Workflow[] }> {
    const response = await fetch(`${API_BASE_URL}/workflows?workflow_type=process`, {
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
    status?: 'draft' | 'active' | 'deprecated';
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

  // CITIZEN VALIDATION METHODS

  // Get citizen instances awaiting validation
  async getCitizenValidations(params?: {
    status?: string;
    limit?: number;
  }): Promise<Array<{
    instance_id: string;
    workflow_id: string;
    workflow_name: string;
    citizen_id: string;
    status: string;
    current_step: {
      step_id: string;
      name: string;
      description: string;
      requires_citizen_input: boolean;
    } | null;
    citizen_data: Record<string, any>;
    uploaded_files: Record<string, any>;
    created_at: string;
    updated_at: string;
    context: Record<string, any>;
  }>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/instances/citizen-validations?${searchParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch citizen validations');
    }

    return await response.json();
  },

  // Validate or reject citizen submitted data
  async validateCitizenData(instanceId: string, decision: 'approve' | 'reject', comments?: string): Promise<{
    success: boolean;
    message: string;
    instance_id: string;
    decision: string;
    next_status: string;
    validated_by: string;
    validation_timestamp: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/instances/${instanceId}/validate-citizen-data`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        decision,
        comments: comments || ''
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to validate citizen data');
    }

    return await response.json();
  },

  // Get detailed citizen data for an instance
  async getCitizenData(instanceId: string): Promise<{
    instance_id: string;
    workflow_id: string;
    workflow_name: string;
    citizen_id: string;
    status: string;
    current_step: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    citizen_data: Record<string, Record<string, any>>;
    uploaded_files: Record<string, Record<string, any>>;
    data_submissions: Array<{
      step_id: string;
      submitted_at: string;
    }>;
    step_executions: Array<{
      step_id: string;
      status: string;
      started_at: string | null;
      completed_at: string | null;
      duration_seconds: number | null;
      inputs: Record<string, any>;
      outputs: Record<string, any>;
    }>;
    validation_history: Array<{
      decision: string;
      comments: string;
      validated_by: string;
      timestamp: string;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/instances/${instanceId}/citizen-data`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch citizen data');
    }

    return await response.json();
  }
};

export default workflowService;