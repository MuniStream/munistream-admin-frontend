import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Schedule,
  PlayArrow,
  Pause,
  Warning,
  Visibility,
  TrendingUp,
  People,
  Speed,
  Refresh
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { workflowService } from '@/services/workflowService';
import { formatDistanceToNow, format } from 'date-fns';

interface InstanceDetailDialogProps {
  instanceId: string | null;
  open: boolean;
  onClose: () => void;
}

function InstanceDetailDialog({ instanceId, open, onClose }: InstanceDetailDialogProps) {
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['instanceProgress', instanceId],
    queryFn: () => instanceId ? workflowService.getInstanceProgress(instanceId) : null,
    enabled: !!instanceId
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['instanceHistory', instanceId],
    queryFn: () => instanceId ? workflowService.getInstanceHistory(instanceId) : null,
    enabled: !!instanceId
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'primary';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'failed': return <Error />;
      case 'running': return <PlayArrow />;
      case 'paused': return <Pause />;
      default: return <Schedule />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Instance Details: {instanceId}
      </DialogTitle>
      <DialogContent dividers>
        {progressLoading || historyLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Progress Overview */}
            {progress && (
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Progress Overview
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box mb={2}>
                          <Typography variant="body2" color="textSecondary">
                            Overall Progress
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={progress.progress_percentage}
                            sx={{ height: 8, borderRadius: 5, mt: 1 }}
                          />
                          <Typography variant="body2" mt={1}>
                            {progress.progress_percentage.toFixed(1)}% Complete
                          </Typography>
                        </Box>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          <Chip
                            icon={<CheckCircle />}
                            label={`${progress.completed_steps} Completed`}
                            color="success"
                            size="small"
                          />
                          <Chip
                            icon={<Schedule />}
                            label={`${progress.pending_steps} Pending`}
                            color="default"
                            size="small"
                          />
                          {progress.failed_steps > 0 && (
                            <Chip
                              icon={<Error />}
                              label={`${progress.failed_steps} Failed`}
                              color="error"
                              size="small"
                            />
                          )}
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="textSecondary">
                          Status
                        </Typography>
                        <Chip
                          icon={getStatusIcon(progress.status)}
                          label={progress.status.toUpperCase()}
                          color={getStatusColor(progress.status) as any}
                          sx={{ mt: 1 }}
                        />
                        <Typography variant="body2" mt={2} color="textSecondary">
                          Duration: {Math.round(progress.total_duration_seconds / 60)} minutes
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Started: {formatDistanceToNow(new Date(progress.started_at))} ago
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Execution Timeline */}
            {history && (
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Execution Timeline
                    </Typography>
                    <List>
                      {history.history.map((step, index) => (
                        <Box key={step.execution_id}>
                          <ListItem>
                            <ListItemIcon>
                              {getStatusIcon(step.status)}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                  <Typography variant="subtitle1">
                                    {step.step_id}
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary">
                                    {step.started_at && format(new Date(step.started_at), 'HH:mm:ss')}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography color="textSecondary">
                                    Status: {step.status}
                                    {step.duration_seconds && (
                                      <> • Duration: {step.duration_seconds.toFixed(2)}s</>
                                    )}
                                    {step.retry_count > 0 && (
                                      <> • Retries: {step.retry_count}</>
                                    )}
                                  </Typography>
                                  {step.error_message && (
                                    <Alert severity="error" sx={{ mt: 1 }}>
                                      {step.error_message}
                                    </Alert>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                          {index < history.history.length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function InstanceTracking() {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch active instances
  const { data: activeInstances, isLoading: activeLoading, error: activeError } = useQuery({
    queryKey: ['activeInstances'],
    queryFn: workflowService.getActiveInstances,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch bottleneck analysis
  const { data: bottlenecks, isLoading: bottlenecksLoading } = useQuery({
    queryKey: ['systemBottlenecks'],
    queryFn: workflowService.getSystemBottlenecks,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const handleViewInstance = (instanceId: string) => {
    setSelectedInstanceId(instanceId);
    setDialogOpen(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['activeInstances'] });
    queryClient.invalidateQueries({ queryKey: ['systemBottlenecks'] });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'primary';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Citizen Instance Tracking
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <People color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {activeInstances?.total_active || 0}
                  </Typography>
                  <Typography color="textSecondary">
                    Active Instances
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Speed color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {bottlenecks?.bottlenecks?.length || 0}
                  </Typography>
                  <Typography color="textSecondary">
                    Bottlenecks
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {bottlenecks?.stuck_instances?.length || 0}
                  </Typography>
                  <Typography color="textSecondary">
                    Stuck Instances
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {activeInstances?.active_instances?.filter(i => i.progress_percentage > 50).length || 0}
                  </Typography>
                  <Typography color="textSecondary">
                    Near Completion
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Instances Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Active Workflow Instances
          </Typography>
          
          {activeLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : activeError ? (
            <Alert severity="error">
              Failed to load active instances. Please try again.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Instance ID</TableCell>
                    <TableCell>Workflow</TableCell>
                    <TableCell>Citizen</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Current Step</TableCell>
                    <TableCell>Started</TableCell>
                    <TableCell>Approvals</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeInstances?.active_instances?.map((instance) => (
                    <TableRow key={instance.instance_id}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {instance.instance_id.substring(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>{instance.workflow_name}</TableCell>
                      <TableCell>{instance.user_id}</TableCell>
                      <TableCell>
                        <Chip
                          label={instance.status}
                          color={getStatusColor(instance.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={instance.progress_percentage}
                            sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="body2">
                            {instance.progress_percentage.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {instance.current_step || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={format(new Date(instance.started_at), 'PPpp')}>
                          <Typography variant="body2">
                            {formatDistanceToNow(new Date(instance.started_at))} ago
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {instance.pending_approvals > 0 ? (
                          <Chip
                            label={instance.pending_approvals}
                            color="warning"
                            size="small"
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleViewInstance(instance.instance_id)}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {!activeInstances?.active_instances?.length && (
                <Box p={3} textAlign="center">
                  <Typography color="textSecondary">
                    No active instances found.
                  </Typography>
                </Box>
              )}
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottlenecks Section */}
      {bottlenecks && bottlenecks.bottlenecks.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Bottlenecks
            </Typography>
            <Grid container spacing={2}>
              {bottlenecks.bottlenecks.slice(0, 5).map((bottleneck) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={bottleneck.step_id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {bottleneck.step_id}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Avg Duration: {bottleneck.avg_duration.toFixed(1)}s
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Failure Rate: {(bottleneck.failure_rate * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Executions: {bottleneck.total_executions}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Instance Detail Dialog */}
      <InstanceDetailDialog
        instanceId={selectedInstanceId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
}

export default InstanceTracking;