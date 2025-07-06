import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayIcon,
  Analytics as AnalyticsIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import workflowService from '@/services/workflowService';
import WorkflowDiagram from '@/components/WorkflowDiagram';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function WorkflowDetail() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const { data: workflowDetails, isLoading } = useQuery({
    queryKey: ['workflow-details', workflowId],
    queryFn: () => workflowService.getWorkflowDetails(workflowId!),
    enabled: !!workflowId,
  });

  const { data: metrics } = useQuery({
    queryKey: ['workflow-metrics', workflowId],
    queryFn: () => workflowService.getWorkflowMetrics(workflowId!),
    enabled: !!workflowId,
  });

  const { data: bottlenecks } = useQuery({
    queryKey: ['workflow-bottlenecks', workflowId],
    queryFn: () => workflowService.getBottleneckAnalysis(workflowId!),
    enabled: !!workflowId,
  });

  const { data: instances } = useQuery({
    queryKey: ['workflow-instances', workflowId],
    queryFn: () => workflowService.getWorkflowInstances({ workflow_id: workflowId, limit: 10 }),
    enabled: !!workflowId,
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'in_progress':
        return <ScheduleIcon color="warning" />;
      default:
        return <ScheduleIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'in_progress':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box>
        <LinearProgress />
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <Typography>Loading workflow details...</Typography>
        </Box>
      </Box>
    );
  }

  if (!workflowDetails) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h6" color="text.secondary">
          Workflow not found
        </Typography>
        <Button onClick={() => navigate('/workflows')} sx={{ mt: 2 }}>
          Back to Workflows
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate('/workflows')}>
          <ArrowBackIcon />
        </IconButton>
        <Box flexGrow={1}>
          <Typography variant="h4" component="h1">
            {workflowDetails.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {workflowDetails.description}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PlayIcon />}
          onClick={() => {
            // Start new workflow instance
            console.log('Start workflow:', workflowId);
          }}
        >
          Start New Instance
        </Button>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {workflowDetails.step_count || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Steps
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {instances?.instances?.filter(i => i.status === 'completed').length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {instances?.instances?.filter(i => i.status === 'running').length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Now
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {bottlenecks?.overall_efficiency ? `${(bottlenecks.overall_efficiency * 100).toFixed(1)}%` : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Efficiency
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Workflow Diagram" />
          <Tab label="Step Performance" />
          <Tab label="Active Instances" />
          <Tab label="Bottleneck Analysis" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <WorkflowDiagram workflowData={workflowDetails} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Step</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Avg Time (ms)</TableCell>
                  <TableCell align="right">Success Rate</TableCell>
                  <TableCell align="right">Executions</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics?.map((metric) => (
                  <TableRow key={metric.step_id}>
                    <TableCell>{metric.step_id}</TableCell>
                    <TableCell>
                      <Chip size="small" label="Action" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      {metric.avg_execution_time_ms?.toFixed(0) || 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      {(metric.success_rate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell align="right">
                      {metric.total_executions}
                    </TableCell>
                    <TableCell>
                      {metric.bottleneck_score > 0.7 ? (
                        <Chip label="Bottleneck" color="error" size="small" />
                      ) : (
                        <Chip label="Normal" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Instance ID</TableCell>
                  <TableCell>Citizen</TableCell>
                  <TableCell>Current Step</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {instances?.instances?.map((instance) => (
                  <TableRow key={instance.instance_id}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {instance.instance_id.slice(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>{instance.user_id}</TableCell>
                    <TableCell>{instance.current_step}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(instance.status)}
                        <Chip
                          label={instance.status}
                          color={getStatusColor(instance.status) as any}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(instance.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/instances/${instance.instance_id}`)}
                      >
                        <AnalyticsIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {bottlenecks ? (
            <Grid container spacing={2}>
              {bottlenecks.bottlenecks?.map((bottleneck) => (
                <Grid size={{ xs: 12, md: 6 }} key={bottleneck.step_id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <SpeedIcon color="warning" />
                        <Typography variant="h6">
                          {bottleneck.step_name}
                        </Typography>
                        <Chip
                          label={bottleneck.severity}
                          color={
                            bottleneck.severity === 'critical' ? 'error' :
                            bottleneck.severity === 'high' ? 'warning' :
                            bottleneck.severity === 'medium' ? 'info' : 'default'
                          }
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        Avg wait time: {(bottleneck.avg_wait_time_ms / 1000).toFixed(1)}s
                      </Typography>
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Recommendations:
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, m: 0 }}>
                        {bottleneck.recommendations.map((rec, index) => (
                          <Typography component="li" variant="body2" key={index}>
                            {rec}
                          </Typography>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                No bottleneck analysis available
              </Typography>
            </Box>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
}

export default WorkflowDetail;