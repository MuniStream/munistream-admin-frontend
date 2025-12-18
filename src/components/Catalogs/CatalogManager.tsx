import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogService, type Catalog } from '../../services/catalogService';
import { CatalogForm } from './CatalogForm';


export const CatalogManager: React.FC = () => {
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('view');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch catalogs
  const { data: catalogsResponse, isLoading, error } = useQuery({
    queryKey: ['catalogs'],
    queryFn: () => catalogService.getCatalogs()
  });

  const catalogs = catalogsResponse?.catalogs || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: catalogService.deleteCatalog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      setDeleteDialogOpen(false);
      setSelectedCatalog(null);
    }
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: catalogService.syncCatalog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      setSyncDialogOpen(false);
    }
  });

  const columns: GridColDef[] = [
    {
      field: 'catalog_id',
      headerName: 'ID Catálogo',
      width: 150,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {params.value}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'name',
      headerName: 'Nombre',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.description}
          </Typography>
        </Box>
      )
    },
    {
      field: 'source_type',
      headerName: 'Tipo Fuente',
      width: 120,
      renderCell: (params) => {
        const sourceTypeColors = {
          sql: 'primary',
          csv: 'secondary',
          json: 'info',
          excel: 'success',
          api: 'warning'
        } as const;

        return (
          <Chip
            label={params.value?.toUpperCase()}
            color={sourceTypeColors[params.value as keyof typeof sourceTypeColors] || 'default'}
            size="small"
          />
        );
      }
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 100,
      renderCell: (params) => {
        const statusColors = {
          active: 'success',
          inactive: 'default',
          error: 'error'
        } as const;

        const statusLabels = {
          active: 'Activo',
          inactive: 'Inactivo',
          error: 'Error'
        } as const;

        return (
          <Chip
            label={statusLabels[params.value as keyof typeof statusLabels]}
            color={statusColors[params.value as keyof typeof statusColors] || 'default'}
            size="small"
          />
        );
      }
    },
    {
      field: 'last_sync',
      headerName: 'Última Sync',
      width: 150,
      renderCell: (params) => {
        if (!params.value) return <Typography variant="caption">Nunca</Typography>;

        const date = new Date(params.value);
        const isRecent = Date.now() - date.getTime() < 24 * 60 * 60 * 1000; // 24 hours

        return (
          <Box>
            <Typography variant="caption" color={isRecent ? 'success.main' : 'text.secondary'}>
              {date.toLocaleDateString()}
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              {date.toLocaleTimeString()}
            </Typography>
            {params.row.last_sync_result && (
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={`${params.row.last_sync_result.rows_synced} filas`}
                  size="small"
                  color={params.row.last_sync_result.success ? 'success' : 'error'}
                />
              </Box>
            )}
          </Box>
        );
      }
    },
    {
      field: 'tags',
      headerName: 'Etiquetas',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {params.value?.slice(0, 3).map((tag: string) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
          {params.value?.length > 3 && (
            <Chip label={`+${params.value.length - 3}`} size="small" variant="outlined" />
          )}
        </Box>
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          key="view"
          icon={<ViewIcon />}
          label="Ver"
          onClick={() => {
            setSelectedCatalog(params.row);
            setDialogMode('view');
            setDialogOpen(true);
          }}
        />,
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Editar"
          onClick={() => {
            setSelectedCatalog(params.row);
            setDialogMode('edit');
            setDialogOpen(true);
          }}
        />,
        <GridActionsCellItem
          key="sync"
          icon={<SyncIcon />}
          label="Sincronizar"
          onClick={() => {
            setSelectedCatalog(params.row);
            setSyncDialogOpen(true);
          }}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Eliminar"
          onClick={() => {
            setSelectedCatalog(params.row);
            setDeleteDialogOpen(true);
          }}
        />
      ]
    }
  ];

  const handleCreateCatalog = () => {
    setSelectedCatalog(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedCatalog(null);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Typography>Cargando catálogos...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error al cargar los catálogos: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gestión de Catálogos
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateCatalog}
        >
          Nuevo Catálogo
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <StorageIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{catalogs.length}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Catálogos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <SyncIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {catalogs.filter(c => c.status === 'active').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Activos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <SecurityIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {catalogs.filter(c => c.permissions?.length > 0).length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Con Permisos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <SettingsIcon color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {catalogs.filter(c => c.status === 'error').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Con Errores
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Catalogs Table */}
      <Paper>
        <DataGrid
          rows={catalogs}
          columns={columns}
          getRowId={(row) => row._id}
          autoHeight
          disableRowSelectionOnClick
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 }
            }
          }}
          pageSizeOptions={[10, 25, 50]}
        />
      </Paper>

      {/* Catalog Dialog */}
      <CatalogForm
        open={dialogOpen}
        onClose={handleDialogClose}
        mode={dialogMode}
        catalog={selectedCatalog}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro de que desea eliminar el catálogo "{selectedCatalog?.name}"?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => selectedCatalog && deleteMutation.mutate(selectedCatalog.catalog_id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sync Confirmation Dialog */}
      <Dialog open={syncDialogOpen} onClose={() => setSyncDialogOpen(false)}>
        <DialogTitle>Sincronizar Catálogo</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Desea sincronizar el catálogo "{selectedCatalog?.name}" con su fuente de datos?
            Esto actualizará todos los datos del catálogo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialogOpen(false)}>Cancelar</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => selectedCatalog && syncMutation.mutate(selectedCatalog.catalog_id)}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};