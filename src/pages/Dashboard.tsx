import { Grid, Paper, Typography, Box, Card, CardContent, Chip } from '@mui/material';
import { 
  People as PeopleIcon,
  Description as DocumentIcon,
  AccountTree as WorkflowIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import workflowService from '@/services/workflowService';
import documentService from '@/services/documentService';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function StatsCard({ title, value, icon, color, subtitle, trend }: StatsCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="div" color={color}>
              {value}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box color={color}>
            {icon}
          </Box>
        </Box>
        {trend && (
          <Box mt={1}>
            <Chip
              icon={<TrendingUpIcon />}
              label={trend === 'up' ? '+12% vs last week' : trend === 'down' ? '-5% vs last week' : 'No change'}
              size="small"
              color={trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'default'}
              variant="outlined"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data: workflowStats } = useQuery({
    queryKey: ['workflow-stats'],
    queryFn: workflowService.getWorkflowStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: documentStats } = useQuery({
    queryKey: ['document-stats'],
    queryFn: documentService.getDocumentStats,
    refetchInterval: 30000,
  });

  const { data: workflows, isLoading: workflowsLoading, error: workflowsError } = useQuery({
    queryKey: ['workflows'],
    queryFn: workflowService.getWorkflows,
  });

  // Debug logging
  console.log('Workflows data:', workflows);
  console.log('Workflows loading:', workflowsLoading);
  console.log('Workflows error:', workflowsError);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard Overview
      </Typography>
      
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Active Citizens"
            value={workflowStats?.active_instances || 0}
            icon={<PeopleIcon sx={{ fontSize: 40 }} />}
            color="primary.main"
            subtitle="In workflows"
            trend="up"
          />
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Pending Reviews"
            value={documentStats?.pending_verification || 0}
            icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
            color="warning.main"
            subtitle="Need attention"
            trend="neutral"
          />
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Documents Today"
            value={documentStats?.verified_today || 0}
            icon={<DocumentIcon sx={{ fontSize: 40 }} />}
            color="success.main"
            subtitle="Processed"
            trend="up"
          />
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Avg Processing"
            value={`${workflowStats?.avg_completion_time_hours?.toFixed(1) || 0}h`}
            icon={<SpeedIcon sx={{ fontSize: 40 }} />}
            color="info.main"
            subtitle="Per workflow"
            trend="down"
          />
        </Grid>

        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Workflow Activity (Last 24 Hours)
            </Typography>
            <Box display="flex" alignItems="center" justifyContent="center" height="80%">
              <Typography variant="body1" color="text.secondary">
                📊 Real-time workflow activity chart would go here
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="subtitle2">
                    🚨 {documentStats?.pending_verification || 0} documents need verification
                  </Typography>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="subtitle2">
                    ⏳ {workflowStats?.active_instances || 0} citizens waiting for approval
                  </Typography>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="subtitle2">
                    📈 System efficiency: {(workflowStats?.success_rate * 100)?.toFixed(1) || 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </Grid>

        {/* Workflow Status Overview */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Available Workflows
            </Typography>
            {workflowsLoading && (
              <Typography>Loading workflows...</Typography>
            )}
            {workflowsError && (
              <Typography color="error">Error loading workflows: {workflowsError.message}</Typography>
            )}
            <Grid container spacing={2}>
              {workflows?.workflows?.map((workflow) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={workflow.workflow_id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <WorkflowIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight="bold">
                          {workflow.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {workflow.description}
                      </Typography>
                      <Chip 
                        label={`${workflow.step_count} steps`} 
                        size="small" 
                        variant="outlined" 
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;