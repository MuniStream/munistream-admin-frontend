import api from './api';

export const adminService = {
  // Pending Approvals
  async getPendingApprovals(): Promise<any[]> {
    const response = await api.get('/admin/pending-approvals');
    return response.data || [];
  },

  // Pending Documents
  async getPendingDocuments(): Promise<any[]> {
    const response = await api.get('/admin/pending-documents');
    return response.data || [];
  },

  // Pending Signatures
  async getPendingSignatures(): Promise<any[]> {
    const response = await api.get('/admin/pending-signatures');
    return response.data || [];
  },

  // Manual Reviews
  async getManualReviews(): Promise<any[]> {
    const response = await api.get('/admin/manual-reviews');
    return response.data || [];
  },

  // Process Approval
  async processApproval(data: {
    instance_id: string;
    decision: string;
    comments: string;
  }): Promise<void> {
    await api.post(`/admin/instances/${data.instance_id}/approve`, {
      decision: data.decision,
      comments: data.comments,
      approved_by: 'current_admin',
      approved_at: new Date().toISOString()
    });
  },

  // Process Document Verification
  async processDocumentVerification(data: {
    document_id: string;
    decision: string;
    comments: string;
  }): Promise<void> {
    await api.post(`/admin/documents/${data.document_id}/admin-verify`, {
      decision: data.decision,
      comments: data.comments
    });
  },

  // Process Signature
  async processSignature(data: {
    document_id: string;
    signature_method: string;
    comments: string;
  }): Promise<void> {
    await api.post(`/admin/documents/${data.document_id}/sign`, {
      signature_method: data.signature_method,
      signature_data: 'admin_digital_signature',
      comments: data.comments
    });
  },

  // Process Manual Review
  async processManualReview(data: {
    review_id: string;
    resolution: string;
    comments: string;
    priority: string;
  }): Promise<void> {
    await api.post(`/admin/manual-reviews/${data.review_id}/resolve`, {
      resolution: data.resolution,
      resolution_notes: data.comments,
      priority: data.priority,
      resolved_by: 'current_admin',
      resolved_at: new Date().toISOString()
    });
  },

  // Get Admin Statistics
  async getAdminStats(): Promise<{
    pending_approvals: number;
    pending_documents: number;
    pending_signatures: number;
    manual_reviews: number;
    total_pending: number;
  }> {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Get Workflow Instances for Admin
  async getWorkflowInstances(params?: {
    status?: string;
    workflow_id?: string;
    citizen_id?: string;
    assigned_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ instances: any[]; total: number }> {
    const response = await api.get('/instances', { params });
    return response.data;
  },

  // Assign Instance to Admin
  async assignInstance(instance_id: string, admin_id: string): Promise<void> {
    await api.post(`/instances/${instance_id}/assign`, {
      assigned_to: admin_id
    });
  },

  // Get Admin Performance Metrics
  async getAdminMetrics(admin_id?: string): Promise<{
    total_processed: number;
    avg_processing_time: number;
    approval_rate: number;
    pending_count: number;
  }> {
    const response = await api.get(`/admin/metrics`, {
      params: { admin_id }
    });
    return response.data;
  },

  // Get Comprehensive Dashboard Data
  async getDashboardData(): Promise<{
    system_metrics: {
      total_active_citizens: number;
      total_workflow_instances: number;
      instances_created_today: number;
      instances_completed_today: number;
      instances_created_this_week: number;
      instances_completed_this_week: number;
    };
    pending_items: {
      pending_approvals: number;
      pending_documents: number;
      pending_signatures: number;
      manual_reviews: number;
      total_pending: number;
      pending_by_priority: Record<string, number>;
    };
    workflow_metrics: Array<{
      workflow_id: string;
      workflow_name: string;
      total_instances: number;
      active_instances: number;
      completed_instances: number;
      failed_instances: number;
      average_processing_time_hours: number;
      success_rate: number;
      pending_approvals: number;
    }>;
    performance_metrics: {
      average_processing_time_hours: number;
      median_processing_time_hours: number;
      success_rate: number;
      failure_rate: number;
      abandonment_rate: number;
      bottleneck_steps: Array<any>;
    };
    recent_activity: Array<{
      timestamp: string;
      value: number;
      label?: string;
    }>;
    top_workflows: Array<{
      workflow_id: string;
      name: string;
      instances: number;
      success_rate: number;
    }>;
    staff_workload: Record<string, number>;
    system_health: {
      status: string;
      database: string;
      pending_items_backlog: boolean;
      high_priority_items: number;
      average_response_time_ms: number;
      last_check: string;
    };
    last_updated: string;
  }> {
    const response = await api.get('/admin/dashboard');
    return response.data;
  }
};

export default adminService;