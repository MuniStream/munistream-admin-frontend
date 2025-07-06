import { useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  PlayArrow as StartIcon,
  Analytics as AnalyticsIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import workflowService from '@/services/workflowService';

const getStepTypeColor = (stepType: string) => {
  const colors: Record<string, string> = {
    'ActionStep': 'primary',
    'ConditionalStep': 'warning',
    'ApprovalStep': 'success',
    'TerminalStep': 'error',
    'DocumentUploadStep': 'info',
    'DocumentVerificationStep': 'secondary',
    'DocumentGenerationStep': 'info',
    'DocumentSigningStep': 'success',
    'IntegrationStep': 'default',
  };
  return colors[stepType] || 'default';
};

const getStepTypeIcon = (stepType: string) => {
  const icons: Record<string, string> = {
    'ActionStep': '⚡',
    'ConditionalStep': '🔀',
    'ApprovalStep': '✅',
    'TerminalStep': '🎯',
    'DocumentUploadStep': '📤',
    'DocumentVerificationStep': '🔍',
    'DocumentGenerationStep': '📄',
    'DocumentSigningStep': '✍️',
    'IntegrationStep': '🔗',
  };
  return icons[stepType] || '📋';
};

function WorkflowsDashboard() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: workflowService.getWorkflows,
  });

  const { data: workflowStats } = useQuery({
    queryKey: ['workflow-stats'],
    queryFn: workflowService.getWorkflowStats,
  });

  const { data: selectedWorkflowDetails } = useQuery({
    queryKey: ['workflow-details', selectedWorkflow],
    queryFn: () => workflowService.getWorkflowDetails(selectedWorkflow!),
    enabled: !!selectedWorkflow,
  });

  const handleWorkflowSelect = (workflowId: string) => {
    setSelectedWorkflow(workflowId);
  };

  const handleViewDetails = (workflowId: string) => {
    navigate(`/workflows/${workflowId}`);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography>Loading workflows...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Workflow Management
      </Typography>

      <Grid container spacing={3}>
        {/* Workflow Cards */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid container spacing={2}>
            {workflows?.workflows?.map((workflow) => {
              const stats = workflowStats?.by_workflow?.[workflow.workflow_id] || 0;
              
              return (
                <Grid size={{ xs: 12, md: 6 }} key={workflow.workflow_id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      border: selectedWorkflow === workflow.workflow_id ? 2 : 0,
                      borderColor: 'primary.main',
                    }}
                    onClick={() => handleWorkflowSelect(workflow.workflow_id)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <WorkflowIcon color="primary" />
                        <Typography variant="h6" component="div">
                          {workflow.name}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" mb={2}>
                        {workflow.description}
                      </Typography>
                      
                      <Box display="flex" gap={1} mb={2}>
                        <Chip 
                          label={`${workflow.step_count} steps`} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={`${stats} active`} 
                          size="small" 
                          color="primary"
                          variant="outlined" 
                        />
                      </Box>

                      {/* Mini step type breakdown */}
                      <Typography variant="caption" color="text.secondary">
                        Step types: Action, Approval, Document, Integration
                      </Typography>
                    </CardContent>
                    
                    <CardActions>
                      <Button 
                        size="small" 
                        startIcon={<ViewIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(workflow.workflow_id);
                        }}
                      >
                        View Details
                      </Button>
                      <Button 
                        size="small" 
                        startIcon={<AnalyticsIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/analytics?workflow=${workflow.workflow_id}`);
                        }}
                      >
                        Analytics
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Grid>

        {/* Selected Workflow Details */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            {selectedWorkflow && selectedWorkflowDetails ? (
              <>
                <Typography variant="h6" gutterBottom>
                  Workflow Steps
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {selectedWorkflowDetails.name}
                </Typography>
                
                <List dense>
                  {selectedWorkflowDetails.steps?.map((step: any, index: number) => (
                    <div key={step.step_id}>
                      <ListItem>
                        <ListItemIcon>
                          <Typography variant="body2">
                            {getStepTypeIcon(step.step_type)}
                          </Typography>
                        </ListItemIcon>
                        <ListItemText
                          primary={step.name}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {step.step_type}
                              </Typography>
                              <Chip
                                label={step.status || 'ready'}
                                size="small"
                                color={getStepTypeColor(step.step_type) as any}
                                variant="outlined"
                                sx={{ mt: 0.5 }}
                              />
                            </Box>
                          }
                        />
                        <IconButton size="small">
                          <TrendingUpIcon fontSize="small" />
                        </IconButton>
                      </ListItem>
                      {index < selectedWorkflowDetails.steps.length - 1 && <Divider />}
                    </div>
                  ))}
                </List>

                <Box mt={2}>
                  <Button
                    variant="contained"
                    startIcon={<ViewIcon />}
                    fullWidth
                    onClick={() => handleViewDetails(selectedWorkflow)}
                  >
                    View Full Diagram
                  </Button>
                </Box>
              </>
            ) : (
              <Box textAlign="center" py={4}>
                <WorkflowIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Select a Workflow
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click on a workflow card to see its step details
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* System Overview */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Overview
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {workflowStats?.total_instances || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Instances
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {workflowStats?.completed_today || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed Today
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {workflowStats?.active_instances || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Currently Active
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {(workflowStats?.success_rate * 100)?.toFixed(1) || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default WorkflowsDashboard;