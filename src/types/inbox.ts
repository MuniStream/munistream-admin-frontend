export interface InboxItem {
  id: string;
  type: InboxItemType;
  title: string;
  description: string;
  priority: Priority;
  status: InboxStatus;
  created_at: string;
  due_date?: string;
  assigned_to: string[];
  citizen_id?: string;
  citizen_name?: string;
  workflow_id: string;
  workflow_name: string;
  instance_id: string;
  step_id: string;
  step_name: string;
  data: InboxItemData;
}

export enum InboxItemType {
  DOCUMENT_VERIFICATION = 'document_verification',
  APPROVAL_REQUEST = 'approval_request',
  DOCUMENT_SIGNING = 'document_signing',
  MANUAL_REVIEW = 'manual_review',
  EXCEPTION_HANDLING = 'exception_handling',
  QUALITY_ASSURANCE = 'quality_assurance'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum InboxStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  DELEGATED = 'delegated'
}

export interface InboxItemData {
  document?: {
    document_id: string;
    filename: string;
    document_type: string;
    confidence_score?: number;
    preview_url?: string;
  };
  approval?: {
    approval_type: string;
    request_details: string;
    supporting_documents: string[];
    previous_approvals: Array<{
      approver: string;
      decision: string;
      timestamp: string;
      comments?: string;
    }>;
  };
  context: Record<string, any>;
}

export interface InboxAction {
  action_id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  requires_comment: boolean;
  confirmation_required: boolean;
}

export interface InboxStats {
  total_pending: number;
  high_priority: number;
  overdue: number;
  assigned_to_me: number;
  completed_today: number;
  avg_resolution_time_hours: number;
  by_type: Record<InboxItemType, number>;
  by_priority: Record<Priority, number>;
}