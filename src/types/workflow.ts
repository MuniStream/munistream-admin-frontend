export interface Workflow {
  workflow_id: string;
  name: string;
  description: string;
  step_count: number;
}

export interface WorkflowStep {
  step_id: string;
  name: string;
  description: string;
  step_type: 
    | 'ActionStep'
    | 'ConditionalStep'
    | 'ApprovalStep'
    | 'IntegrationStep'
    | 'TerminalStep'
    | 'DocumentUploadStep'
    | 'DocumentVerificationStep'
    | 'DocumentExistenceCheckStep'
    | 'DocumentGenerationStep'
    | 'DocumentSigningStep';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  next_steps: string[];
  required_inputs?: string[];
  approvers?: string[];
  verifier_roles?: string[];
}

export interface WorkflowInstance {
  instance_id: string;
  workflow_id: string;
  user_id: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  current_step: string;
  created_at: string;
  updated_at: string;
  context: Record<string, any>;
  step_results: Record<string, StepResult>;
}

export interface StepResult {
  step_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  outputs: Record<string, any>;
  errors?: string[];
  execution_duration_ms?: number;
  queue_time_ms?: number;
  validation_duration_ms?: number;
  retry_count: number;
  memory_usage_mb?: number;
  started_at?: string;
  completed_at?: string;
}

export interface PerformanceMetrics {
  step_id: string;
  workflow_id: string;
  avg_execution_time_ms: number;
  median_execution_time_ms: number;
  p95_execution_time_ms: number;
  p99_execution_time_ms: number;
  total_executions: number;
  success_rate: number;
  avg_queue_time_ms: number;
  avg_memory_usage_mb: number;
  last_24h_executions: number;
  bottleneck_score: number;
}

export interface BottleneckAnalysis {
  workflow_id: string;
  bottlenecks: Array<{
    step_id: string;
    step_name: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    avg_wait_time_ms: number;
    impact_score: number;
    recommendations: string[];
  }>;
  overall_efficiency: number;
  total_processing_time_ms: number;
  estimated_time_savings_ms: number;
}