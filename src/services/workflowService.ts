import api from './api';
import type { 
  Workflow, 
  WorkflowInstance, 
  PerformanceMetrics, 
  BottleneckAnalysis 
} from '@/types/workflow';

export const workflowService = {
  // Get all available workflows
  async getWorkflows(): Promise<{ workflows: Workflow[] }> {
    const response = await api.get('/performance/workflows');
    return response.data;
  },

  // Get workflow details with steps
  async getWorkflowDetails(workflowId: string): Promise<any> {
    const response = await api.get(`/workflows/${workflowId}`);
    return response.data;
  },

  // Get workflow instances (citizen progress tracking)
  async getWorkflowInstances(params?: {
    workflow_id?: string;
    status?: string;
    citizen_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ instances: WorkflowInstance[]; total: number }> {
    const response = await api.get('/instances', { params });
    return response.data;
  },

  // Get specific workflow instance
  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstance> {
    const response = await api.get(`/instances/${instanceId}`);
    return response.data;
  },

  // Get performance metrics for a workflow
  async getWorkflowMetrics(workflowId: string): Promise<PerformanceMetrics[]> {
    const response = await api.get(`/performance/workflows/${workflowId}/metrics`);
    return response.data.metrics;
  },

  // Get bottleneck analysis
  async getBottleneckAnalysis(workflowId: string): Promise<BottleneckAnalysis> {
    const response = await api.get(`/performance/workflows/${workflowId}/bottlenecks`);
    return response.data;
  },

  // Get step metrics
  async getStepMetrics(stepId: string): Promise<PerformanceMetrics> {
    const response = await api.get(`/performance/steps/${stepId}/metrics`);
    return response.data;
  },

  // Execute a specific step manually (for testing)
  async executeStep(stepId: string, inputs: Record<string, any>): Promise<any> {
    const response = await api.post(`/performance/steps/${stepId}/execute`, { inputs });
    return response.data;
  },

  // Start a new workflow instance
  async startWorkflow(workflowId: string, context: Record<string, any>): Promise<WorkflowInstance> {
    const response = await api.post(`/workflows/${workflowId}/start`, context);
    return response.data;
  },

  // Get workflow execution history
  async getWorkflowHistory(params?: {
    workflow_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<any[]> {
    const response = await api.get('/performance/history', { params });
    return response.data.history;
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
    const response = await api.get('/performance/stats');
    return response.data;
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
    const response = await api.get(`/instances/${instanceId}/progress`);
    return response.data;
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
    const response = await api.get('/instances/active');
    return response.data;
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
    const response = await api.get('/instances/analytics/bottlenecks');
    return response.data;
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
    const response = await api.get(`/instances/${instanceId}/history`);
    return response.data;
  }
};

export default workflowService;