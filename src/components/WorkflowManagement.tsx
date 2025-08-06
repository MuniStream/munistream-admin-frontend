import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountTree as WorkflowIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useI18n } from '../contexts/I18nContext';
import { workflowService } from '../services/workflowService';
import { categoryService, Category } from '../services/categoryService';
import { userService, User } from '../services/userService';

interface ExtendedWorkflow {
  workflow_id: string;
  name: string;
  description: string;
  version: string;
  status: 'draft' | 'active' | 'deprecated';
  steps: WorkflowStep[]; // Always required, never undefined
  start_step_id: string;
  category_id?: string;
  category_name?: string;
  assigned_users: string[]; // Always an array
  approvers: string[]; // Always an array
  created_at: string;
  updated_at: string;
}

interface WorkflowStep {
  step_id: string;
  name: string;
  step_type: string;
  description: string;
  required_inputs: string[];
  next_steps: string[];
}

interface WorkflowFormData {
  name: string;
  description: string;
  version: string;
  status: 'draft' | 'active' | 'deprecated';
  category_id: string;
  assigned_users: string[];
  approvers: string[];
}

const WorkflowManagement: React.FC = () => {
  const { t } = useI18n();
  const [workflows, setWorkflows] = useState<ExtendedWorkflow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ExtendedWorkflow | null>(null);
  const [viewingWorkflow, setViewingWorkflow] = useState<ExtendedWorkflow | null>(null);
  const [formData, setFormData] = useState<WorkflowFormData>({
    name: '',
    description: '',
    version: '1.0.0',
    status: 'draft',
    category_id: '',
    assigned_users: [],
    approvers: []
  });

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await workflowService.getWorkflows();
      console.log('Workflows response:', response);
      const extendedWorkflows = response.workflows.map(workflow => {
        console.log('Processing workflow:', workflow.workflow_id, 'steps:', workflow.steps?.length);
        return {
          ...workflow,
          steps: workflow.steps || [], // Ensure steps is always an array
          category_name: categories.find(cat => cat.id === workflow.category_id)?.name,
          assigned_users: workflow.assigned_users || [],
          approvers: workflow.approvers || []
        };
      });
      setWorkflows(extendedWorkflows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading workflows');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoryService.getCategories();
      setCategories(response.categories);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await userService.getUsers();
      setUsers(users);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleCreateWorkflow = () => {
    setEditingWorkflow(null);
    setFormData({
      name: '',
      description: '',
      version: '1.0.0',
      status: 'draft',
      category_id: '',
      assigned_users: [],
      approvers: []
    });
    setDialogOpen(true);
  };

  const handleEditWorkflow = (workflow: ExtendedWorkflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      status: workflow.status,
      category_id: workflow.category_id || '',
      assigned_users: workflow.assigned_users || [],
      approvers: workflow.approvers || []
    });
    setDialogOpen(true);
  };

  const handleViewWorkflow = (workflow: ExtendedWorkflow) => {
    setViewingWorkflow(workflow);
    setViewDialogOpen(true);
  };

  const handleSaveWorkflow = async () => {
    try {
      if (editingWorkflow) {
        // Update existing workflow
        await workflowService.updateWorkflow(editingWorkflow.workflow_id, {
          name: formData.name,
          description: formData.description,
          status: formData.status,
          metadata: {
            category_id: formData.category_id || null,
            assigned_users: formData.assigned_users,
            approvers: formData.approvers
          }
        });
        
        // Update category assignment if changed
        if (formData.category_id && formData.category_id !== editingWorkflow.category_id) {
          await categoryService.assignWorkflowToCategory(formData.category_id, editingWorkflow.workflow_id);
        }
      } else {
        // Create new workflow
        const workflowId = `${formData.name.toLowerCase().replace(/\s+/g, '_')}_v${formData.version}`;
        await workflowService.createWorkflow({
          workflow_id: workflowId,
          name: formData.name,
          description: formData.description,
          version: formData.version
        });
        
        // Assign category if selected
        if (formData.category_id) {
          await categoryService.assignWorkflowToCategory(formData.category_id, workflowId);
        }
      }
      
      await loadWorkflows();
      setDialogOpen(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving workflow');
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    const workflow = workflows.find(w => w.workflow_id === workflowId);
    if (!workflow) return;

    if (window.confirm(`¿Estás seguro de que quieres eliminar el workflow "${workflow.name}"?`)) {
      try {
        await workflowService.deleteWorkflow(workflowId);
        await loadWorkflows();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error deleting workflow');
      }
    }
  };

  const handleAssignCategory = async (workflowId: string, categoryId: string) => {
    try {
      await categoryService.assignWorkflowToCategory(categoryId, workflowId);
      await loadWorkflows();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error assigning category');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      'draft': 'warning',
      'active': 'success',
      'deprecated': 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'draft': 'Borrador',
      'active': 'Activo',
      'deprecated': 'Obsoleto'
    };
    return labels[status] || status;
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

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadCategories(), loadUsers()]);
      await loadWorkflows();
    };
    loadData();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            ⚙️ Gestión de Workflows
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Administra workflows, categorías y usuarios autorizadores
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadWorkflows}
            disabled={loading}
          >
            {t('refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateWorkflow}
          >
            Crear Workflow
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Workflows Disponibles ({workflows.length} total)
          </Typography>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Workflow</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Pasos</TableCell>
                  <TableCell>Usuarios</TableCell>
                  <TableCell>Actualizado</TableCell>
                  <TableCell>{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.workflow_id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WorkflowIcon color="primary" />
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {workflow.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            v{workflow.version} • {workflow.workflow_id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {workflow.category_name ? (
                        <Chip
                          size="small"
                          label={workflow.category_name}
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Sin categoría
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(workflow.status)}
                        color={getStatusColor(workflow.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {workflow.steps.length} pasos
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {workflow.assigned_users?.length || 0} asignados
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(workflow.updated_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Ver Detalles">
                          <IconButton
                            size="small"
                            onClick={() => handleViewWorkflow(workflow)}
                            color="info"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('edit')}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditWorkflow(workflow)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('delete')}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteWorkflow(workflow.workflow_id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {workflows.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No hay workflows disponibles
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create/Edit Workflow Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingWorkflow ? 'Editar Workflow' : 'Crear Workflow'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Nombre del Workflow"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Versión"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                sx={{ flex: 1 }}
              />
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  label="Estado"
                >
                  <MenuItem value="draft">Borrador</MenuItem>
                  <MenuItem value="active">Activo</MenuItem>
                  <MenuItem value="deprecated">Obsoleto</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                label="Categoría"
              >
                <MenuItem value="">Sin categoría</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              multiple
              options={users}
              getOptionLabel={(user) => `${user.full_name} (${user.role})`}
              value={users.filter(user => formData.assigned_users.includes(user.id))}
              onChange={(_, newUsers) => 
                setFormData({ 
                  ...formData, 
                  assigned_users: newUsers.map(user => user.id) 
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Usuarios Asignados"
                  placeholder="Seleccionar usuarios..."
                />
              )}
              sx={{ mb: 2 }}
            />
            <Autocomplete
              multiple
              options={users.filter(user => ['admin', 'manager', 'approver'].includes(user.role))}
              getOptionLabel={(user) => `${user.full_name} (${user.role})`}
              value={users.filter(user => formData.approvers.includes(user.id))}
              onChange={(_, newUsers) => 
                setFormData({ 
                  ...formData, 
                  approvers: newUsers.map(user => user.id) 
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Aprobadores"
                  placeholder="Seleccionar aprobadores..."
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveWorkflow}
            disabled={!formData.name.trim()}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Workflow Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Detalles del Workflow: {viewingWorkflow?.name}
        </DialogTitle>
        <DialogContent>
          {viewingWorkflow && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Información General
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>ID:</strong> {viewingWorkflow.workflow_id}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Descripción:</strong> {viewingWorkflow.description}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Versión:</strong> {viewingWorkflow.version}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Estado:</strong> {getStatusLabel(viewingWorkflow.status)}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Pasos del Workflow ({viewingWorkflow.steps.length})
              </Typography>
              <List dense>
                {viewingWorkflow.steps.map((step, index) => (
                  <ListItem key={step.step_id}>
                    <ListItemIcon>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px'
                        }}
                      >
                        {index + 1}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={step.name}
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" color="text.secondary" component="span" display="block">
                            {step.description}
                          </Typography>
                          <Box sx={{ mt: 0.5 }} component="span" display="block">
                            <Chip
                              label={step.step_type}
                              size="small"
                              variant="outlined"
                              sx={{ mr: 1 }}
                            />
                            {step.required_inputs.length > 0 && (
                              <Chip
                                label={`${step.required_inputs.length} inputs`}
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowManagement;