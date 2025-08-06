import api from './api';

export interface TeamMember {
  user_id: string;
  role: 'member' | 'leader' | 'coordinator';
  joined_at: string;
  is_active: boolean;
}

export interface Team {
  team_id: string;
  name: string;
  description?: string;
  department?: string;
  members: TeamMember[];
  max_concurrent_tasks: number;
  specializations: string[];
  working_hours: Record<string, any>;
  assigned_workflows: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  active_member_count: number;
  leader_count: number;
}

export interface CreateTeamRequest {
  team_id: string;
  name: string;
  description?: string;
  department?: string;
  max_concurrent_tasks?: number;
  specializations?: string[];
  working_hours?: Record<string, any>;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  department?: string;
  max_concurrent_tasks?: number;
  specializations?: string[];
  working_hours?: Record<string, any>;
  is_active?: boolean;
}

export interface AddTeamMemberRequest {
  user_id: string;
  role?: 'member' | 'leader' | 'coordinator';
}

export interface UpdateTeamMemberRequest {
  role?: 'member' | 'leader' | 'coordinator';
  is_active?: boolean;
}

export interface TeamStats {
  team_id: string;
  name: string;
  active_members: number;
  assigned_workflows: number;
  current_workload: number;
  capacity_utilization: number;
  average_completion_time?: number;
  success_rate: number;
}

export const teamService = {
  // Get all teams
  async getTeams(params?: {
    page?: number;
    page_size?: number;
    department?: string;
    is_active?: boolean;
  }): Promise<{ teams: Team[]; total: number; page: number; page_size: number }> {
    const response = await api.get('/teams', { params });
    return response.data;
  },

  // Get team by ID
  async getTeam(teamId: string): Promise<Team> {
    const response = await api.get(`/teams/${teamId}`);
    return response.data;
  },

  // Create new team
  async createTeam(data: CreateTeamRequest): Promise<Team> {
    const response = await api.post('/teams', data);
    return response.data;
  },

  // Update existing team
  async updateTeam(teamId: string, data: UpdateTeamRequest): Promise<Team> {
    const response = await api.put(`/teams/${teamId}`, data);
    return response.data;
  },

  // Delete team
  async deleteTeam(teamId: string): Promise<void> {
    await api.delete(`/teams/${teamId}`);
  },

  // Team member management
  async addTeamMember(teamId: string, data: AddTeamMemberRequest): Promise<Team> {
    const response = await api.post(`/teams/${teamId}/members`, data);
    return response.data;
  },

  async updateTeamMember(teamId: string, userId: string, data: UpdateTeamMemberRequest): Promise<Team> {
    const response = await api.put(`/teams/${teamId}/members/${userId}`, data);
    return response.data;
  },

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await api.delete(`/teams/${teamId}/members/${userId}`);
  },

  // Workflow assignment
  async assignWorkflowToTeam(teamId: string, workflowId: string): Promise<void> {
    await api.post(`/teams/${teamId}/workflows/${workflowId}`);
  },

  async unassignWorkflowFromTeam(teamId: string, workflowId: string): Promise<void> {
    await api.delete(`/teams/${teamId}/workflows/${workflowId}`);
  },

  // Get team statistics
  async getTeamStats(teamId: string): Promise<TeamStats> {
    const response = await api.get(`/teams/${teamId}/stats`);
    return response.data;
  },

  // Smart task assignment
  async assignTask(data: {
    workflow_id: string;
    instance_id: string;
    step_id: string;
    priority?: number;
    required_skills?: string[];
    estimated_duration?: number;
  }): Promise<{
    assigned_team_id: string;
    assigned_user_id?: string;
    assignment_reason: string;
    estimated_start_time?: string;
    queue_position?: number;
  }> {
    const response = await api.post('/teams/assign-task', data);
    return response.data;
  }
};