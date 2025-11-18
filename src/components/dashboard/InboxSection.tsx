import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Badge,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  TablePagination,
  InputAdornment
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Flag as PriorityIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import workflowService from '@/services/workflowService';

interface InboxSectionProps {
  refreshInterval?: number;
}

export const InboxSection: React.FC<InboxSectionProps> = ({
  refreshInterval = 30000
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [startingInstances, setStartingInstances] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Fetch assigned instances
  const {
    data: assignedData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['assigned-instances', statusFilter, searchTerm, page, rowsPerPage],
    queryFn: () => workflowService.getAssignedInstances({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchTerm || undefined,
      skip: page * rowsPerPage,
      limit: rowsPerPage
    }),
    refetchInterval: refreshInterval,
  });

  // Start workflow mutation
  const startWorkflowMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      console.log('📞 Calling API to start workflow:', instanceId);
      setStartingInstances(prev => new Set(prev).add(instanceId));

      // Call the endpoint to start the workflow
      const result = await workflowService.startAssignedWorkflow(instanceId);

      // DEBUG: Log the result
      console.log('✅ Workflow start API response:', result);

      // NO REDIRECT AT ALL

      return { instanceId, result };
    },
    onSuccess: ({ instanceId, result }) => {
      // Refresh the assignments list after successful start
      queryClient.invalidateQueries({ queryKey: ['assigned-instances'] });
    },
    onError: (error: Error, instanceId: string) => {
      console.error('Failed to start workflow:', error);
      setStartingInstances(prev => {
        const newSet = new Set(prev);
        newSet.delete(instanceId);
        return newSet;
      });
    },
    onSettled: (_, __, instanceId: string) => {
      setStartingInstances(prev => {
        const newSet = new Set(prev);
        newSet.delete(instanceId);
        return newSet;
      });
    }
  });

  const handleQuickAction = (instance: any) => {
    const needsStart = ['waiting_for_start', 'pending_assignment'].includes(instance.workflow_status || instance.status);

    if (needsStart) {
      // Start workflow (NO REDIRECT)
      console.log('🚀 Starting workflow for instance:', instance.instance_id);
      startWorkflowMutation.mutate(instance.instance_id);
    } else {
      // View only (keeping this for now)
      console.log('👁️ Viewing workflow instance:', instance.instance_id);
      navigate(`/admin-workflow/${instance.instance_id}`);
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'waiting_for_start':
      case 'pending_assignment':
        return 'warning';
      case 'running':
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string | null | undefined): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (!priority || typeof priority !== 'string') {
      return 'default';
    }
    switch (priority.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else {
      return `${diffDays}d`;
    }
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const assignments = assignedData?.assignments || [];
  const totalCount = assignedData?.total || 0;

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing page size
  };

  // Since filtering is now done on backend, we use assignments directly
  const filteredAssignments = assignments;

  const pendingCount = assignments.filter(a =>
    ['waiting_for_start', 'pending_assignment'].includes(a.workflow_status || a.status)
  ).length;

  if (error) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Error al cargar Inbox</Typography>
          <Typography>{error instanceof Error ? error.message : 'Error desconocido'}</Typography>
          <Button onClick={() => refetch()} sx={{ mt: 1 }}>
            Reintentar
          </Button>
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h5">
            Mi Inbox
          </Typography>
          {pendingCount > 0 && (
            <Badge badgeContent={pendingCount} color="warning">
              <ScheduleIcon color="warning" />
            </Badge>
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          <TextField
            size="small"
            placeholder="Buscar por nombre, email, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filtrar por Estado</InputLabel>
            <Select
              value={statusFilter}
              label="Filtrar por Estado"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="waiting_for_start">Esperando Inicio</MenuItem>
              <MenuItem value="pending_assignment">Pendiente Asignación</MenuItem>
              <MenuItem value="running">En Ejecución</MenuItem>
              <MenuItem value="completed">Completado</MenuItem>
              <MenuItem value="failed">Fallido</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Actualizar inbox">
            <IconButton onClick={() => refetch()} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isLoading && assignments.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress size={32} />
          <Typography ml={2}>Cargando instancias asignadas...</Typography>
        </Box>
      ) : assignments.length === 0 ? (
        <Alert severity="info">
          <Typography variant="h6">No tienes instancias asignadas</Typography>
          <Typography>
            Cuando tengas workflows asignados aparecerán aquí para poder iniciarlos o revisarlos.
          </Typography>
        </Alert>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '60%' }}>Workflow & Ciudadano</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Asignado</TableCell>
                <TableCell align="center">Progreso</TableCell>
                <TableCell align="center">Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAssignments.map((assignment) => {
                const needsStart = ['waiting_for_start', 'pending_assignment'].includes(assignment.workflow_status || assignment.status);
                const isStarting = startingInstances.has(assignment.instance_id);

                return (
                  <TableRow
                    key={assignment.instance_id}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      ...(needsStart && {
                        borderLeft: 4,
                        borderLeftColor: 'warning.main'
                      })
                    }}
                  >
                    <TableCell sx={{ width: '60%' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                          {assignment.workflow_name}
                        </Typography>

                        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                          {assignment.citizen_email ? (
                            <>
                              <EmailIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {assignment.citizen_email}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Sin ciudadano
                            </Typography>
                          )}
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          ID: {assignment.instance_id.slice(0, 8)}...
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={(assignment.workflow_status || assignment.status).replace('_', ' ').toUpperCase()}
                        color={getStatusColor(assignment.workflow_status || assignment.status)}
                        size="small"
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {getTimeAgo(assignment.assigned_at || assignment.created_at)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatShortDate(assignment.assigned_at || assignment.created_at)}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: '100%', maxWidth: 60 }}>
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(assignment.completion_percentage)}%
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title={isStarting ? 'Iniciando...' : needsStart ? 'Iniciar' : 'Ver'}>
                        <IconButton
                          color={needsStart ? "success" : "primary"}
                          onClick={() => handleQuickAction(assignment)}
                          disabled={isStarting}
                          size="small"
                        >
                          {isStarting ? (
                            <CircularProgress size={20} />
                          ) : needsStart ? (
                            <StartIcon />
                          ) : (
                            <ViewIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination - Always show when we have data */}
      {(assignments.length > 0 || totalCount > 0) && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 20, 50]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      )}

      {assignments.length > 0 && (
        <Box mt={2} textAlign="center">
          <Typography variant="caption" color="text.secondary">
            {searchTerm && `Búsqueda: "${searchTerm}" • `}
            {statusFilter !== 'all' && `Filtrado por estado: ${statusFilter.replace('_', ' ')} • `}
            {pendingCount > 0 && (
              <>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''} de iniciar</>
            )}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default InboxSection;