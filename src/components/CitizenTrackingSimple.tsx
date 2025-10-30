import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Pagination,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { workflowService } from '../services/workflowService';
import { useI18n } from '../contexts/I18nContext';

const CitizenTrackingSimple: React.FC = () => {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [availableWorkflows, setAvailableWorkflows] = useState<any[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);

  const loadInstances = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params: any = {
        page: page,
        page_size: pageSize
      };

      if (searchTerm.trim()) {
        params.instance_id = searchTerm.trim();
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (workflowFilter.trim()) {
        params.workflow_id = workflowFilter.trim();
      }
      if (userFilter.trim()) {
        params.user_id = userFilter.trim();
      }
      if (dateFromFilter) {
        params.created_from = dateFromFilter;
      }
      if (dateToFilter) {
        params.created_to = dateToFilter;
      }

      console.log('Loading instances with params:', params);
      const response = await workflowService.getWorkflowInstances(params);
      console.log('Response:', response);
      
      setInstances(response.instances || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('Error loading instances:', err);
      setError(err instanceof Error ? err.message : 'Error loading instances');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadInstances();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setWorkflowFilter('');
    setUserFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setPage(1);
    loadInstances();
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
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

  useEffect(() => {
    loadInstances();
    loadWorkflows();
  }, [page]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      'pending': 'default',
      'running': 'primary',
      'awaiting_input': 'warning',
      'pending_validation': 'info',
      'completed': 'success',
      'failed': 'error',
      'cancelled': 'default',
      'paused': 'secondary'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📊 {t('citizenTracking')}
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Monitorea todas las solicitudes y trámites ciudadanos en tiempo real
      </Typography>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Basic Search Row */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label={t('searchInstanceId')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('instanceIdPlaceholder')}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth sx={{ minWidth: 120 }}>
                <InputLabel>{t('status')}</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Estado"
                >
                  <MenuItem value="">{t('allStatuses')}</MenuItem>
                  <MenuItem value="pending">{t('statusPending')}</MenuItem>
                  <MenuItem value="running">{t('statusRunning')}</MenuItem>
                  <MenuItem value="awaiting_input">{t('statusAwaitingInput')}</MenuItem>
                  <MenuItem value="pending_validation">{t('statusPendingValidation')}</MenuItem>
                  <MenuItem value="completed">{t('statusCompleted')}</MenuItem>
                  <MenuItem value="failed">{t('statusFailed')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
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
                <Typography variant="caption" color="text.secondary">
                  {t('advancedFilters')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Advanced Filters */}
          <Collapse in={showAdvancedFilters}>
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
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
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={t('filterByUser')}
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    placeholder="ID del usuario"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label={t('createdFrom')}
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label={t('createdTo')}
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
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

      {/* Results */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {t('citizenRequests')} ({total} {t('total')})
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('page')} {page} {t('of')} {Math.ceil(total / pageSize)}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={loadInstances}
                disabled={loading}
              >
                {t('refresh')}
              </Button>
            </Box>
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('instanceId')}</TableCell>
                  <TableCell>{t('user')}</TableCell>
                  <TableCell>{t('workflow')}</TableCell>
                  <TableCell>{t('status')}</TableCell>
                  <TableCell>{t('created')}</TableCell>
                  <TableCell>{t('updated')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {instances.map((instance) => (
                  <TableRow key={instance.instance_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {instance.instance_id?.slice(0, 8)}...
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
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
                        label={getStatusLabel(instance.status)}
                        color={getStatusColor(instance.status)}
                        size="small"
                      />
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
                  </TableRow>
                ))}
                {instances.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        {searchTerm || statusFilter || workflowFilter || userFilter || dateFromFilter || dateToFilter
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
          {total > pageSize && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={Math.ceil(total / pageSize)}
                page={page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CitizenTrackingSimple;