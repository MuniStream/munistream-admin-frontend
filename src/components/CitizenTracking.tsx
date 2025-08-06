import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Pagination,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
  PersonAdd as AssignUserIcon
} from '@mui/icons-material';
import { workflowService } from '../services/workflowService';
import type { WorkflowInstance } from '../types/workflow';
import { useI18n } from '../contexts/I18nContext';

interface CitizenInstance {
  instance_id: string;
  workflow_id: string;
  user_id: string;
  status: string;
  current_step?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  step_results?: Record<string, any>;
  // Assignment fields
  assigned_user_id?: string;
  assigned_team_id?: string;
  assignment_status?: string;
  assignment_type?: string;
  assigned_at?: string;
  assigned_by?: string;
  assignment_notes?: string;
}

interface InstanceProgress {
  instance_id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  progress_percentage: number;
  current_step?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  total_steps: number;
  completed_steps: number;
  step_progress: Array<{
    step_id: string;
    name: string;
    description: string;
    status: string;
    started_at?: string;
    completed_at?: string;
    requires_citizen_input: boolean;
  }>;
  requires_input: boolean;
  input_form?: any;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  'pending': 'default',
  'running': 'primary',
  'awaiting_input': 'warning',
  'pending_validation': 'info',
  'completed': 'success',
  'failed': 'error',
  'cancelled': 'default',
  'paused': 'secondary'
};

const statusLabels: Record<string, string> = {
  'pending': 'Pendiente',
  'running': 'En Proceso',
  'awaiting_input': 'Esperando Datos',
  'pending_validation': 'Pendiente Validación',
  'completed': 'Completado',
  'failed': 'Fallido',
  'cancelled': 'Cancelado',
  'paused': 'En Pausa',
  'in_progress': 'En Progreso'
};

const getStatusLabel = (status: string, t: any) => {
  const labels: Record<string, string> = {
    'pending': t('statusPending'),
    'running': t('statusRunning'),
    'awaiting_input': t('statusAwaitingInput'),
    'pending_validation': t('statusPendingValidation'),
    'completed': t('statusCompleted'),
    'failed': t('statusFailed'),
    'cancelled': t('statusCancelled'),
    'paused': t('statusPaused')
  };
  return labels[status] || status;
};

export const CitizenTracking: React.FC = () => {
  const { t } = useI18n();
  const [instances, setInstances] = useState<CitizenInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedInstance, setSelectedInstance] = useState<InstanceProgress | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [availableWorkflows, setAvailableWorkflows] = useState<any[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  const [assignedInstances, setAssignedInstances] = useState<CitizenInstance[]>([]);
  const [assignedTotal, setAssignedTotal] = useState(0);
  const [loadingAssigned, setLoadingAssigned] = useState(false);

  const loadInstances = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params: Record<string, any> = {
        page,
        page_size: pageSize
      };

      if (searchTerm.trim()) {
        params.instance_id = searchTerm.trim();
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (workflowFilter) {
        params.workflow_id = workflowFilter;
      }
      if (dateFromFilter) {
        params.created_from = dateFromFilter;
      }
      if (dateToFilter) {
        params.created_to = dateToFilter;
      }

      const response = await workflowService.getWorkflowInstances(params);
      setInstances(response.instances);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading instances');
    } finally {
      setLoading(false);
    }
  };

  const loadInstanceDetails = async (instanceId: string) => {
    try {
      const progress = await workflowService.getInstanceProgress(instanceId);
      setSelectedInstance(progress);
      setDetailsOpen(true);
    } catch (err) {
      setError(`Error loading instance details: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const loadWorkflows = async () => {
    try {
      setLoadingWorkflows(true);
      const response = await workflowService.getWorkflows();
      setAvailableWorkflows(response.workflows || []);
    } catch (err) {
      console.error('Error loading workflows:', err);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const loadAssignedInstances = async () => {
    try {
      setLoadingAssigned(true);
      
      const params: Record<string, any> = {
        page,
        page_size: pageSize
      };

      // Apply same filters for consistency
      if (searchTerm.trim()) {
        params.instance_id = searchTerm.trim();
      }
      if (statusFilter) {
        params.assignment_status = statusFilter;
      }
      if (workflowFilter) {
        params.workflow_id = workflowFilter;
      }

      const response = await fetch('/api/v1/instances/my-assignments?' + new URLSearchParams(params), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assigned instances');
      }

      const data = await response.json();
      setAssignedInstances(data.instances || []);
      setAssignedTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading assigned instances');
    } finally {
      setLoadingAssigned(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      loadInstances();
    } else if (tabValue === 1) {
      loadAssignedInstances();
    }
    loadWorkflows();
  }, [page, pageSize, tabValue]);

  const handleSearch = () => {
    setPage(1);
    if (tabValue === 0) {
      loadInstances();
    } else if (tabValue === 1) {
      loadAssignedInstances();
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setWorkflowFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setPage(1);
    loadInstances();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📊 {t('citizenTracking')}
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Monitorea todas las solicitudes y trámites ciudadanos en tiempo real
      </Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab 
            label={
              <Badge badgeContent={total} color="primary">
                {t('citizenRequests')}
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={assignedTotal} color="secondary">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon />
                  {t('my_assignments')}
                </Box>
              </Badge>
            } 
          />
        </Tabs>
      </Paper>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Basic Search Row */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label={t('searchInstanceId')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('instanceIdPlaceholder')}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth sx={{ minWidth: 120 }}>
                <InputLabel>{t('status')}</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Estado"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pending">Pendiente</MenuItem>
                  <MenuItem value="running">Ejecutándose</MenuItem>
                  <MenuItem value="awaiting_input">Esperando Info</MenuItem>
                  <MenuItem value="pending_validation">Pend. Validación</MenuItem>
                  <MenuItem value="completed">Completado</MenuItem>
                  <MenuItem value="failed">Fallido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth sx={{ minWidth: 200 }}>
                <InputLabel>{t('workflow')}</InputLabel>
                <Select
                  value={workflowFilter}
                  onChange={(e) => setWorkflowFilter(e.target.value)}
                  label="Workflow"
                  disabled={loadingWorkflows}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        width: 350,
                      },
                    },
                  }}
                >
                  <MenuItem value="">{t('allWorkflows')}</MenuItem>
                  {availableWorkflows.map((workflow) => (
                    <MenuItem key={workflow.workflow_id} value={workflow.workflow_id}>
                      <Box sx={{ width: '100%' }}>
                        <Typography variant="body2">
                          {workflow.name || workflow.workflow_id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {workflow.category && `📂 ${workflow.category}`}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  startIcon={<SearchIcon />}
                  disabled={loading}
                >
                  {t('search')}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClearFilters}
                  startIcon={<ClearIcon />}
                  disabled={loading}
                >
                  {t('clear')}
                </Button>
                <IconButton
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  size="large"
                  sx={{
                    transform: showAdvancedFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s',
                    backgroundColor: showAdvancedFilters ? 'primary.light' : 'transparent',
                    color: showAdvancedFilters ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: 'primary.light'
                    }
                  }}
                >
                  <ExpandMoreIcon fontSize="large" />
                </IconButton>
                <Typography 
                  variant="caption" 
                  color={showAdvancedFilters ? 'primary.main' : 'text.secondary'}
                  sx={{ fontWeight: showAdvancedFilters ? 'bold' : 'normal' }}
                >
                  {t('advancedFilters')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Advanced Filters */}
          <Collapse in={showAdvancedFilters}>
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    {t('dateFilters')}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}></Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label={t('createdFrom')}
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label={t('createdTo')}
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('filterTip')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {t('citizenRequests')} ({total} {t('total')})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={loadInstances}
              disabled={loading}
            >
              {t('refresh')}
            </Button>
          </Box>

          {(loading || (tabValue === 1 && loadingAssigned)) && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('instanceId')}</TableCell>
                  <TableCell>{t('user')}</TableCell>
                  <TableCell>{t('workflow')}</TableCell>
                  <TableCell>{t('status')}</TableCell>
                  {tabValue === 1 && <TableCell>{t('assignment_status')}</TableCell>}
                  {tabValue === 1 && <TableCell>{t('assigned_to')}</TableCell>}
                  <TableCell>Progreso</TableCell>
                  <TableCell>{t('created')}</TableCell>
                  <TableCell>{t('updated')}</TableCell>
                  <TableCell>{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(tabValue === 0 ? instances : assignedInstances).map((instance) => (
                  <TableRow key={instance.instance_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {instance.instance_id.slice(0, 8)}...
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {instance.instance_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {instance.user_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {instance.workflow_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(instance.status, t)}
                        color={statusColors[instance.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    {tabValue === 1 && (
                      <TableCell>
                        <Chip
                          label={instance.assignment_status || 'unassigned'}
                          color={
                            instance.assignment_status === 'completed' ? 'success' :
                            instance.assignment_status === 'in_progress' ? 'warning' :
                            instance.assignment_status === 'assigned' ? 'info' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                    )}
                    {tabValue === 1 && (
                      <TableCell>
                        {instance.assigned_user_id ? (
                          <Chip 
                            icon={<AssignUserIcon />} 
                            label={`User: ${instance.assigned_user_id.slice(0, 8)}...`} 
                            size="small" 
                          />
                        ) : instance.assigned_team_id ? (
                          <Chip 
                            icon={<AssignmentIcon />} 
                            label={`Team: ${instance.assigned_team_id}`} 
                            size="small" 
                          />
                        ) : (
                          <Typography variant="body2" color="textSecondary">-</Typography>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={0} // We'll calculate this when we get step data
                          sx={{ width: 60, height: 6 }}
                        />
                        <Typography variant="caption">
                          {instance.current_step ? 'En proceso' : 'Iniciado'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(instance.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(instance.updated_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t('viewDetails')}>
                        <IconButton
                          onClick={() => loadInstanceDetails(instance.instance_id)}
                          color="primary"
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {instances.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        {searchTerm || statusFilter || workflowFilter || dateFromFilter || dateToFilter
                          ? t('noRequestsFound')
                          : t('noRequestsAvailable')
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={Math.ceil((tabValue === 0 ? total : assignedTotal) / pageSize)}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Instance Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('viewDetails')}
          {selectedInstance && (
            <Typography component="span" variant="subtitle2" color="text.secondary" sx={{ ml: 2 }}>
              {selectedInstance.instance_id}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedInstance && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Información General
                  </Typography>
                  <Typography><strong>Trámite:</strong> {selectedInstance.workflow_name}</Typography>
                  <Typography><strong>Estado:</strong> {statusLabels[selectedInstance.status] || selectedInstance.status}</Typography>
                  <Typography><strong>Progreso:</strong> {selectedInstance.progress_percentage.toFixed(1)}%</Typography>
                  <Typography><strong>Paso Actual:</strong> {selectedInstance.current_step || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Fechas
                  </Typography>
                  <Typography><strong>Creado:</strong> {formatDate(selectedInstance.created_at)}</Typography>
                  <Typography><strong>Actualizado:</strong> {formatDate(selectedInstance.updated_at)}</Typography>
                  {selectedInstance.completed_at && (
                    <Typography><strong>Completado:</strong> {formatDate(selectedInstance.completed_at)}</Typography>
                  )}
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Progreso de Pasos ({selectedInstance.completed_steps}/{selectedInstance.total_steps})
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={selectedInstance.progress_percentage}
                  color={getProgressColor(selectedInstance.progress_percentage)}
                  sx={{ height: 8, borderRadius: 4, mb: 2 }}
                />
                
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {selectedInstance.step_progress && selectedInstance.step_progress.length > 0 ? (
                    selectedInstance.step_progress.slice(0, 10).map((step, index) => (
                    <Box key={step.step_id} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          size="small"
                          label={statusLabels[step.status] || step.status}
                          color={statusColors[step.status] || 'default'}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {step.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {step.description}
                      </Typography>
                      {step.requires_citizen_input && (
                        <Chip size="small" label="Requiere Info Ciudadano" color="warning" sx={{ mt: 0.5 }} />
                      )}
                    </Box>
                  ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No hay información de progreso disponible
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CitizenTracking;