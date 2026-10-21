import { useMemo, useState } from 'react';
import {
  Typography,
  Box,
  Paper,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  SupervisorAccount as SudoIcon,
  Schema as DiagramIcon,
  Analytics as AnalyticsIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import workflowService from '@/services/workflowService';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/ui/PageContainer';
import { useTranslation } from 'react-i18next';

type SortField = 'name' | 'step_count' | 'status';
type SortDir = 'asc' | 'desc';

// The description is the first column dropped when width runs short.
const descriptionDisplay = { xs: 'none', xl: 'table-cell' };

function WorkflowsDashboard() {
  const { t } = useTranslation();
  const [sudoDialogOpen, setSudoDialogOpen] = useState(false);
  const [sudoWorkflowId, setSudoWorkflowId] = useState<string | null>(null);
  const [sudoUserId, setSudoUserId] = useState('');
  const [sudoError, setSudoError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canViewAnalytics = hasPermission('admin_system');

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: workflowService.getWorkflows,
  });

  const { data: workflowStats } = useQuery({
    queryKey: ['workflow-stats'],
    queryFn: workflowService.getWorkflowStats,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ workflowId, newStatus }: { workflowId: string; newStatus: string }) =>
      workflowService.updateWorkflow(workflowId, { status: newStatus as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const sudoMutation = useMutation({
    mutationFn: ({ workflowId, userId }: { workflowId: string; userId: string }) =>
      workflowService.startWorkflowOnBehalf(workflowId, userId),
    onSuccess: (data) => {
      setSudoDialogOpen(false);
      setSudoUserId('');
      setSudoError(null);
      navigate(`/instances/${data.instance_id}`);
    },
    onError: (error: Error) => {
      setSudoError(error.message);
    },
  });

  const filteredWorkflows = useMemo(() => {
    let list = workflows?.workflows || [];

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((w) =>
        w.name.toLowerCase().includes(q) ||
        w.workflow_id.toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      list = list.filter((w) => (w.status || 'active') === statusFilter);
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'step_count') {
        cmp = (a.step_count || 0) - (b.step_count || 0);
      } else if (sortField === 'status') {
        cmp = ((a as any).status || 'active').localeCompare((b as any).status || 'active');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [workflows, search, statusFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleToggleStatus = (workflowId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    toggleStatusMutation.mutate({ workflowId, newStatus });
  };

  const handleOpenSudo = (workflowId: string) => {
    setSudoWorkflowId(workflowId);
    setSudoUserId('');
    setSudoError(null);
    setSudoDialogOpen(true);
  };

  const handleSubmitSudo = () => {
    if (!sudoWorkflowId || !sudoUserId.trim()) return;
    sudoMutation.mutate({ workflowId: sudoWorkflowId, userId: sudoUserId.trim() });
  };

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'draft': return 'warning';
      case 'archived': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'draft': return 'Borrador';
      case 'archived': return 'Archivado';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography>Cargando workflows...</Typography>
      </Box>
    );
  }

  return (
    <PageContainer title={t('workflows')}>

      {/* Filters */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
        <TextField
          size="small"
          placeholder="Buscar por nombre o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: '1 1 260px', maxWidth: 400 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Estado</InputLabel>
          <Select
            value={statusFilter}
            label="Estado"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="active">Activo</MenuItem>
            <MenuItem value="inactive">Inactivo</MenuItem>
            <MenuItem value="draft">Borrador</MenuItem>
            <MenuItem value="archived">Archivado</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Fixed layout with per-column widths: name and description take the
          remaining space and wrap, so the table never overflows the screen and
          the actions stay visible. */}
      <TableContainer component={Paper}>
        <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortDir : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  Nombre
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: '35%', display: descriptionDisplay }}>Descripción</TableCell>
              <TableCell align="center" sx={{ width: 80 }}>
                <TableSortLabel
                  active={sortField === 'step_count'}
                  direction={sortField === 'step_count' ? sortDir : 'asc'}
                  onClick={() => handleSort('step_count')}
                >
                  Pasos
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ width: 100, whiteSpace: 'normal' }}>Instancias activas</TableCell>
              <TableCell align="center" sx={{ width: 160 }}>
                <TableSortLabel
                  active={sortField === 'status'}
                  direction={sortField === 'status' ? sortDir : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Estado
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ width: canViewAnalytics ? 168 : 136 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredWorkflows.map((workflow) => {
              const activeInstances = workflowStats?.active_by_workflow?.[workflow.workflow_id] || 0;
              const status = workflow.status || 'active';
              const isActive = status === 'active';

              return (
                <TableRow
                  key={workflow.workflow_id}
                  sx={{ opacity: isActive ? 1 : 0.6 }}
                >
                  <TableCell>
                    <Typography variant="subtitle2">{workflow.name}</Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontFamily="monospace"
                      sx={{ display: 'block', overflowWrap: 'anywhere' }}
                    >
                      {workflow.workflow_id}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: descriptionDisplay }}>
                    <Tooltip title={workflow.description || ''} placement="top-start">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {workflow.description}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">{workflow.step_count || 0}</TableCell>
                  <TableCell align="center">{activeInstances}</TableCell>
                  <TableCell align="center">
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                      <Chip
                        label={getStatusLabel(status)}
                        size="small"
                        color={getStatusChipColor(status) as any}
                      />
                      <Tooltip title={isActive ? 'Desactivar' : 'Activar'}>
                        <Switch
                          checked={isActive}
                          onChange={() => handleToggleStatus(workflow.workflow_id, status)}
                          size="small"
                          color="success"
                          slotProps={{ input: { 'aria-label': isActive ? 'Desactivar trámite' : 'Activar trámite' } }}
                        />
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={0.5}>
                      <Tooltip title="Ver Detalle">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/workflows/${workflow.workflow_id}`)}
                            disabled={!isActive}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Ver Diagrama">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/workflows/${workflow.workflow_id}`)}
                            disabled={!isActive}
                          >
                            <DiagramIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Ejecutar como...">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenSudo(workflow.workflow_id)}
                            disabled={!isActive}
                          >
                            <SudoIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {canViewAnalytics && (
                        <Tooltip title="Analíticas">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/analytics?workflow=${workflow.workflow_id}`)}
                              disabled={!isActive}
                            >
                              <AnalyticsIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredWorkflows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {search || statusFilter !== 'all'
                      ? 'No se encontraron trámites con los filtros aplicados'
                      : 'No hay trámites disponibles'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Sudo Dialog */}
      <Dialog open={sudoDialogOpen} onClose={() => setSudoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ejecutar Trámite a Nombre de Usuario</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Iniciar una instancia de este trámite como si fuera otro usuario (ciudadano).
          </Typography>
          {sudoError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {sudoError}
            </Alert>
          )}
          <TextField
            autoFocus
            label="ID o correo del usuario"
            fullWidth
            value={sudoUserId}
            onChange={(e) => setSudoUserId(e.target.value)}
            placeholder="usuario@ejemplo.com o user-id"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSudoDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmitSudo}
            disabled={!sudoUserId.trim() || sudoMutation.isPending}
            startIcon={<SudoIcon />}
          >
            {sudoMutation.isPending ? 'Iniciando...' : 'Ejecutar'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}

export default WorkflowsDashboard;
