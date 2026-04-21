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
import WorkflowDiagram from '@/components/WorkflowDiagram';

type SortField = 'name' | 'step_count' | 'status';
type SortDir = 'asc' | 'desc';

function WorkflowsDashboard() {
  const [sudoDialogOpen, setSudoDialogOpen] = useState(false);
  const [sudoWorkflowId, setSudoWorkflowId] = useState<string | null>(null);
  const [sudoUserId, setSudoUserId] = useState('');
  const [sudoError, setSudoError] = useState<string | null>(null);
  const [diagramDialogOpen, setDiagramDialogOpen] = useState(false);
  const [diagramWorkflowId, setDiagramWorkflowId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: workflowService.getWorkflows,
  });

  const { data: workflowStats } = useQuery({
    queryKey: ['workflow-stats'],
    queryFn: workflowService.getWorkflowStats,
  });

  const { data: diagramWorkflowDetails } = useQuery({
    queryKey: ['workflow-details', diagramWorkflowId],
    queryFn: () => workflowService.getWorkflowDetails(diagramWorkflowId!),
    enabled: !!diagramWorkflowId,
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
      navigate(`/admin-workflow/${data.instance_id}`);
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

  const handleOpenDiagram = (workflowId: string) => {
    setDiagramWorkflowId(workflowId);
    setDiagramDialogOpen(true);
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
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Gestión de Trámites
      </Typography>

      {/* Filters */}
      <Box display="flex" gap={2} mb={2}>
        <TextField
          size="small"
          placeholder="Buscar por nombre o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 300 }}
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

      <TableContainer component={Paper}>
        <Table>
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
              <TableCell>Descripción</TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'step_count'}
                  direction={sortField === 'step_count' ? sortDir : 'asc'}
                  onClick={() => handleSort('step_count')}
                >
                  Pasos
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Instancias Activas</TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'status'}
                  direction={sortField === 'status' ? sortDir : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Estado
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Activo</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredWorkflows.map((workflow) => {
              const stats = workflowStats?.by_workflow?.[workflow.workflow_id] || 0;
              const status = workflow.status || 'active';
              const isActive = status === 'active';

              return (
                <TableRow
                  key={workflow.workflow_id}
                  sx={{ opacity: isActive ? 1 : 0.6 }}
                >
                  <TableCell>
                    <Typography variant="subtitle2">{workflow.name}</Typography>
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                      {workflow.workflow_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }} noWrap>
                      {workflow.description}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{workflow.step_count || 0}</TableCell>
                  <TableCell align="center">{stats}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={getStatusLabel(status)}
                      size="small"
                      color={getStatusChipColor(status) as any}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={isActive}
                      onChange={() => handleToggleStatus(workflow.workflow_id, status)}
                      size="small"
                      color="success"
                    />
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
                            onClick={() => handleOpenDiagram(workflow.workflow_id)}
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
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredWorkflows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
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

      {/* Diagram Dialog */}
      <Dialog open={diagramDialogOpen} onClose={() => setDiagramDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Diagrama del Trámite</DialogTitle>
        <DialogContent>
          {diagramWorkflowDetails ? (
            <WorkflowDiagram workflowData={diagramWorkflowDetails} />
          ) : (
            <Box textAlign="center" p={3}>
              <Typography>Cargando diagrama...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiagramDialogOpen(false)}>Cerrar</Button>
          {diagramWorkflowId && (
            <Button variant="outlined" onClick={() => {
              setDiagramDialogOpen(false);
              navigate(`/workflows/${diagramWorkflowId}`);
            }}>
              Ver Detalle Completo
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WorkflowsDashboard;
