// Per-workflow analytics: efficiency KPIs, step bottlenecks, status
// distribution and volume over time. Driven by the ?workflow= query param.
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Stack,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayIcon,
  Assessment as AssessmentIcon,
  HourglassEmpty as HourglassIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  ResponsiveContainer,
} from 'recharts';
import workflowService from '@/services/workflowService';
import type { StepBottleneck } from '@/types/workflow';
import PageContainer from '@/components/ui/PageContainer';
import StatCard from '@/components/ui/StatCard';
import { CHART_PALETTE } from '@/theme/tokens';

// Antes era una copia a mano de la paleta de Material, que arrancaba en azul y
// no guardaba relación con la del panel.
const CHART_COLORS = CHART_PALETTE;

const SEVERITY_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  none: 'default',
  low: 'info',
  medium: 'warning',
  high: 'error',
};

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86400).toFixed(1)} d`;
}

function KpiCard({ title, value, icon, color, subtitle }: KpiCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="div" color={color}>
              {value}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.85 }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function AnalyticsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get('workflow') || '';

  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['workflow-analytics', workflowId],
    queryFn: () => workflowService.getWorkflowAnalytics(workflowId),
    enabled: !!workflowId,
  });

  if (!workflowId) {
    return (
      <Box>
        <Alert severity="info">{t('analytics.noWorkflowSelected')}</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !analytics) {
    return (
      <Box>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              {t('analytics.retry')}
            </Button>
          }
        >
          {t('analytics.loadError')}
        </Alert>
      </Box>
    );
  }

  const { kpis, bottlenecks, status_distribution, volume_over_time } = analytics;

  const topBottlenecks: StepBottleneck[] = bottlenecks.slice(0, 10);
  const bottleneckChartData = topBottlenecks
    .filter((b) => b.avg_duration_seconds != null)
    .map((b) => ({
      name: b.step_name,
      seconds: b.avg_duration_seconds as number,
    }));

  const statusChartData = status_distribution.map((s) => ({
    name: t(`analytics.status.${s.status}`, s.status),
    value: s.count,
  }));

  const totalStuck = bottlenecks.reduce((acc, b) => acc + b.currently_stuck_count, 0);
  const hasVolume = volume_over_time.some((v) => v.started > 0 || v.completed > 0);

  return (
    <PageContainer
      title={t('analytics.title')}
      subtitle={workflowId}
      actions={
        <IconButton onClick={() => navigate(`/workflows/${workflowId}`)} aria-label={t('analytics.back')}>
          <ArrowBackIcon />
        </IconButton>
      }
    >

      {/* KPIs */}
      <Grid container spacing={3} mb={1}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('analytics.totalInstances')}
            value={kpis.total_instances}
            icon={<AssessmentIcon fontSize="large" />}
            sublabel={t('analytics.activeNow', { count: kpis.active_instances })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('analytics.completionRate')}
            value={`${kpis.completion_rate.toFixed(1)}%`}
            icon={<CheckCircleIcon fontSize="large" />}
            tone="success"
            sublabel={t('analytics.completedInstances', { count: kpis.completed_instances })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('analytics.avgDuration')}
            value={formatDuration(kpis.avg_duration_seconds)}
            icon={<SpeedIcon fontSize="large" />}
            tone="info"
            sublabel={t('analytics.medianDuration', { value: formatDuration(kpis.median_duration_seconds) })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('analytics.overallEfficiency')}
            value={`${kpis.overall_efficiency.toFixed(1)}%`}
            icon={<PlayIcon fontSize="large" />}
            color={kpis.failed_instances > 0 ? 'warning.main' : 'success.main'}
            sublabel={t('analytics.failedInstances', { count: kpis.failed_instances })}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Bottlenecks bar chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: 420 }}>
            <Typography variant="h6" gutterBottom>
              {t('analytics.bottlenecksTitle')}
            </Typography>
            {bottleneckChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={bottleneckChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatDuration(v)} />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        return (
                          <Paper sx={{ p: 1 }}>
                            <Typography variant="body2">{payload[0].payload.name}</Typography>
                            <Typography variant="body2" color="primary">
                              {formatDuration(payload[0].value as number)}
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="seconds" fill={CHART_PALETTE[4]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="88%">
                <Stack spacing={2} alignItems="center">
                  <HourglassIcon sx={{ fontSize: 60, color: 'text.disabled' }} />
                  <Typography color="text.secondary">{t('analytics.noStepData')}</Typography>
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Status distribution pie */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: 420 }}>
            <Typography variant="h6" gutterBottom>
              {t('analytics.statusDistribution')}
            </Typography>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="88%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {statusChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="88%">
                <Typography color="text.secondary">{t('analytics.noData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Bottleneck detail table */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="h6">{t('analytics.stepDetailTitle')}</Typography>
              {totalStuck > 0 && (
                <Chip
                  color="error"
                  size="small"
                  icon={<ErrorIcon />}
                  label={t('analytics.stuckTotal', { count: totalStuck })}
                />
              )}
            </Box>
            {bottlenecks.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('analytics.colStep')}</TableCell>
                      <TableCell align="right">{t('analytics.colAvg')}</TableCell>
                      <TableCell align="right">{t('analytics.colP95')}</TableCell>
                      <TableCell align="right">{t('analytics.colExecutions')}</TableCell>
                      <TableCell align="right">{t('analytics.colStuck')}</TableCell>
                      <TableCell align="center">{t('analytics.colSeverity')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bottlenecks.map((b) => (
                      <TableRow key={b.step_id} hover>
                        <TableCell>{b.step_name}</TableCell>
                        <TableCell align="right">{formatDuration(b.avg_duration_seconds)}</TableCell>
                        <TableCell align="right">{formatDuration(b.p95_duration_seconds)}</TableCell>
                        <TableCell align="right">{b.execution_count}</TableCell>
                        <TableCell align="right">{b.currently_stuck_count || '—'}</TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            color={SEVERITY_COLOR[b.severity] || 'default'}
                            label={t(`analytics.severity.${b.severity}`, b.severity)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">{t('analytics.noStepData')}</Typography>
            )}
          </Paper>
        </Grid>

        {/* Volume over time */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t('analytics.volumeTitle')}
            </Typography>
            {hasVolume ? (
              <ResponsiveContainer width="100%" height="88%">
                <LineChart data={volume_over_time}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="started"
                    name={t('analytics.started')}
                    stroke={CHART_PALETTE[1]}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name={t('analytics.completed')}
                    stroke={CHART_PALETTE[3]}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="88%">
                <Typography color="text.secondary">{t('analytics.noData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
}

export default AnalyticsPage;
