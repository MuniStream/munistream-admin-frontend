import api from './api';

// Types
export interface AssignmentResponse {
  instance_id: string;
  workflow_id: string;
  workflow_type: string;
  workflow_name: string;
  status: string;
  assigned_to_user?: string;
  assigned_to_team?: string;
  assigned_at?: string;
  assigned_by?: string;
  parent_instance_id?: string;
  parent_workflow_id?: string;
  priority?: number;
  created_at: string;
  updated_at: string;
  citizen_email?: string;
  current_step?: string;
  completion_percentage: number;
}

export interface AssignmentListResponse {
  assignments: AssignmentResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserAssignmentInfo {
  user_id: string;
  user_email: string;
  user_name: string;
  role: string;
  teams: string[];
  current_assignments: number;
  max_assignments: number;
  available: boolean;
}

export interface TeamInfo {
  team_id: string;
  team_name: string;
  member_count: number;
  current_load: number;
  available: boolean;
}

export interface AssignmentRequest {
  assign_to: {
    team?: string;
    admin?: string;
  };
  priority?: number;
  notes?: string;
}

export interface WorkflowStartRequest {
  initial_data?: Record<string, any>;
  notes?: string;
}

export interface WorkflowStartResponse {
  instance_id: string;
  status: string;
  started_at: string;
  started_by: string;
  message: string;
}

// Assignment Service
export class AssignmentService {
  // List assignments with filters
  static async listAssignments(params: {
    workflow_type?: string;
    team_id?: string;
    user_id?: string;
    status?: string;
    parent_instance_id?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<AssignmentListResponse> {
    const response = await api.get('/assignments/', { params });
    return response.data;
  }

  // List available users for assignment
  static async listAssignableUsers(params: {
    role?: string;
    team_id?: string;
  } = {}): Promise<UserAssignmentInfo[]> {
    const response = await api.get('/assignments/users', { params });
    return response.data;
  }

  // List available teams
  static async listAvailableTeams(): Promise<TeamInfo[]> {
    const response = await api.get('/assignments/teams');
    return response.data;
  }

  // Assign workflow to user or team
  static async assignWorkflow(instanceId: string, request: AssignmentRequest): Promise<any> {
    const response = await api.post(`/assignments/${instanceId}/assign`, request);
    return response.data;
  }

  // Start assigned workflow
  static async startWorkflow(instanceId: string, request: WorkflowStartRequest = {}): Promise<WorkflowStartResponse> {
    const response = await api.post(`/assignments/${instanceId}/start`, request);
    return response.data;
  }

  // Get assignment statistics
  static async getAssignmentStats(params: {
    team_id?: string;
    workflow_type?: string;
  } = {}): Promise<any> {
    const response = await api.get('/assignments/stats', { params });
    return response.data;
  }

  // Quick assign to current user and start
  static async quickStartAssignment(instanceId: string, notes?: string): Promise<any> {
    // First assign to current user
    const assignResponse = await api.post(`/assignments/${instanceId}/assign`, {
      assign_to: { admin: 'current_user' }, // This should be handled by the backend
      notes: notes || 'Quick assignment and start'
    });

    // Then start the workflow
    const startResponse = await this.startWorkflow(instanceId, {
      notes: notes || 'Quick start'
    });

    return {
      assignment: assignResponse.data,
      start: startResponse
    };
  }

  // Legacy compatibility methods for existing instance endpoints
  static async getMyAssignments(params: {
    page?: number;
    page_size?: number;
    assignment_status?: string;
    workflow_id?: string;
    team_id?: string;
  } = {}): Promise<{ instances: any[], total: number }> {
    try {
      // Try the new assignment endpoint first
      const response = await this.listAssignments({
        skip: params.page ? (params.page - 1) * (params.page_size || 10) : 0,
        limit: params.page_size || 10,
        status: params.assignment_status,
        team_id: params.team_id
      });

      return {
        instances: response.assignments.map(assignment => ({
          instance_id: assignment.instance_id,
          workflow_id: assignment.workflow_id,
          user_id: assignment.citizen_email || 'unknown',
          status: assignment.status,
          current_step: assignment.current_step,
          assigned_user_id: assignment.assigned_to_user,
          assigned_team_id: assignment.assigned_to_team,
          assignment_status: assignment.status,
          assignment_type: 'MANUAL',
          assigned_at: assignment.assigned_at,
          assigned_by: assignment.assigned_by,
          assignment_notes: '',
          created_at: assignment.created_at,
          updated_at: assignment.updated_at,
          completed_at: null
        })),
        total: response.total
      };
    } catch (error) {
      // Fallback to legacy endpoint if new one fails
      console.warn('New assignment endpoint failed, trying legacy:', error);
      const response = await api.get('/instances/my-assignments', { params });
      return response.data;
    }
  }

  // Compatibility method for user assignment
  static async assignToUser(instanceId: string, userId: string, notes?: string): Promise<any> {
    return this.assignWorkflow(instanceId, {
      assign_to: { admin: userId },
      notes
    });
  }

  // Compatibility method for team assignment
  static async assignToTeam(instanceId: string, teamId: string, notes?: string): Promise<any> {
    return this.assignWorkflow(instanceId, {
      assign_to: { team: teamId },
      notes
    });
  }
}

export default AssignmentService;