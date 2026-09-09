// Enhanced Dashboard with comprehensive metrics and visualizations
import { useState, useEffect } from 'react';
import {
  TableRow,
  TableHead,
  TableContainer,
  TableCell,
  TableBody,
  Table,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
  Stack
} from '@mui/material';
import {
  People as PeopleIcon,
  Description as DocumentIcon,
  AccountTree as WorkflowIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  PriorityHigh as PriorityHighIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import PageContainer from '@/components/ui/PageContainer';
import StatCard from '@/components/ui/StatCard';
import { CHART_PALETTE } from '@/theme/tokens';
import DashboardInbox from '@/components/dashboard/DashboardInbox';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import adminService from '@/services/adminService';

const COLORS = CHART_PALETTE;

function DashboardEnhanced() {
  const { t } = useTranslation();
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: adminService.getDashboardData,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate trends
  const getTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {t('dash.errorLoading', { message: (error as Error).message })}
          <Button onClick={() => refetch()} sx={{ ml: 2 }}>{t('dash.retry')}</Button>
        </Alert>
      </Box>
    );
  }

  const systemMetrics = dashboardData?.system_metrics;
  const pendingItems = dashboardData?.pending_items;
  const workflowMetrics = dashboardData?.workflow_metrics || [];
  const performanceMetrics = dashboardData?.performance_metrics;
  const recentActivity = dashboardData?.recent_activity || [];
  const topWorkflows = dashboardData?.top_workflows || [];
  const systemHealth = dashboardData?.system_health;

  // Prepare data for charts
  const pieData = pendingItems ? [
    { name: t('dash.approvals'), value: pendingItems.pending_approvals },
    { name: t('dash.documents'), value: pendingItems.pending_documents },
    { name: t('dash.signatures'), value: pendingItems.pending_signatures },
    { name: t('dash.reviews'), value: pendingItems.manual_reviews },
  ].filter(item => item.value > 0) : [];

  const activityData = recentActivity.map(item => ({
    ...item,
    date: item.label || new Date(item.timestamp).toLocaleDateString('en', { weekday: 'short' })
  }));

  return (
    <PageContainer
      title={t('dash.title')}
      actions={
        dashboardData ? (
          <Typography variant="caption" color="text.secondary" noWrap>
            {t('dash.lastUpdated', { time: new Date(dashboardData.last_updated).toLocaleTimeString() })}
          </Typography>
        ) : undefined
      }
      surface={false}
    >

      {/* La misma lista que Mi bandeja, en resumen: mismo componente, no una
          tercera implementación. */}
      <DashboardInbox />

      <Grid container spacing={3}>
        {/* Key Metrics Cards */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('dash.activeCitizens')}
            value={systemMetrics?.total_active_citizens || 0}
            icon={<PeopleIcon sx={{ fontSize: 40 }} />}
            sublabel={t('dash.uniqueUsers')}
            loading={isLoading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('dash.totalInstances')}
            value={systemMetrics?.total_workflow_instances || 0}
            icon={<WorkflowIcon sx={{ fontSize: 40 }} />}
            tone="info"
            sublabel={t('dash.createdToday', { count: systemMetrics?.instances_created_today || 0 })}
            loading={isLoading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('dash.pendingItems')}
            value={pendingItems?.total_pending || 0}
            icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
            tone="warning"
            sublabel={t('dash.highPriority', { count: pendingItems?.pending_by_priority?.high || 0 })}
            loading={isLoading}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('dash.successRate')}
            value={`${performanceMetrics?.success_rate?.toFixed(1) || 0}%`}
            icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
            tone="success"
            sublabel={t('dash.avgTime', { hours: performanceMetrics?.average_processing_time_hours?.toFixed(1) || 0 })}
            loading={isLoading}
          />
        </Grid>

        {/* Weekly Activity Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t('dash.weeklyActivity')}
            </Typography>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_PALETTE[0]}
                    strokeWidth={2}
                    name={t('dash.instancesCreated')}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="85%">
                <Typography color="text.secondary">{t('dash.noActivityData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Pending Items Distribution */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Pending Items
            </Typography>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill={CHART_PALETTE[0]}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="85%">
                <Stack spacing={2} alignItems="center">
                  <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />
                  <Typography color="text.secondary">{t('dash.noPendingItems')}</Typography>
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Top Workflows */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t('dash.topWorkflows')}
            </Typography>
            {topWorkflows.length > 0 ? (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={topWorkflows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="workflow_id" hide />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        return (
                          <Paper sx={{ p: 1 }}>
                            <Typography variant="body2">{payload[0].payload.name}</Typography>
                            <Typography variant="body2" color="primary">
                              {t('dash.tooltipInstances', { value: payload[0].value })}
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              {t('dash.tooltipSuccess', { value: payload[0].payload.success_rate })}
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="instances" fill={CHART_PALETTE[0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="85%">
                <Typography color="text.secondary">{t('dash.noWorkflowData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* System Health & Performance */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t('dash.systemHealth')}
            </Typography>
            <List>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: systemHealth?.status === 'healthy' ? 'success.main' : 'error.main' }}>
                    {systemHealth?.status === 'healthy' ? <CheckCircleIcon /> : <ErrorIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={t('dash.systemStatus')}
                  secondary={systemHealth?.status || t('dash.unknown')}
                />
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <SpeedIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={t('dash.responseTime')}
                  secondary={`${systemHealth?.average_response_time_ms || 0}ms`}
                />
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: pendingItems?.pending_by_priority?.high ? 'warning.main' : 'success.main' }}>
                    {pendingItems?.pending_by_priority?.high ? <PriorityHighIcon /> : <CheckCircleIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={t('dash.highPriorityItems')}
                  secondary={pendingItems?.pending_by_priority?.high || 0}
                />
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <AssessmentIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={t('dash.performanceScore')}
                  secondary={
                    <LinearProgress
                      variant="determinate"
                      value={performanceMetrics?.success_rate || 0}
                      sx={{ mt: 1 }}
                      color={performanceMetrics?.success_rate >= 80 ? 'success' : 'warning'}
                    />
                  }
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Workflow Metrics Table */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('dash.workflowPerformance')}
            </Typography>
            {/* Tabla del sistema, no HTML con estilos en línea: así hereda la
                tipografía, la densidad, el hover y los bordes como el resto. */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('dash.colWorkflow')}</TableCell>
                    <TableCell align="center">{t('dash.colTotal')}</TableCell>
                    <TableCell align="center">{t('dash.colActive')}</TableCell>
                    <TableCell align="center">{t('dash.colCompleted')}</TableCell>
                    <TableCell align="center">{t('dash.colFailed')}</TableCell>
                    <TableCell align="center">{t('dash.colSuccessRate')}</TableCell>
                    <TableCell align="center">{t('dash.colAvgTime')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workflowMetrics.slice(0, 5).map((workflow) => (
                    <TableRow key={workflow.workflow_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {workflow.workflow_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {workflow.workflow_id}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{workflow.total_instances}</TableCell>
                      <TableCell align="center">{workflow.active_instances}</TableCell>
                      <TableCell align="center">{workflow.completed_instances}</TableCell>
                      <TableCell align="center">{workflow.failed_instances}</TableCell>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={workflow.success_rate}
                            sx={{ width: 60 }}
                            color={workflow.success_rate >= 80 ? 'success' : workflow.success_rate >= 50 ? 'warning' : 'error'}
                          />
                          <Typography variant="body2">
                            {workflow.success_rate.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {workflow.average_processing_time_hours.toFixed(1)}h
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
}

export default DashboardEnhanced;