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
  ListItemSecondaryAction,
  Avatar,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Refresh as RefreshIcon,
  Analytics as StatsIcon,
  Assignment as WorkflowIcon,
  Star as LeaderIcon
} from '@mui/icons-material';
import { useI18n } from '../contexts/I18nContext';
import { teamService, Team, CreateTeamRequest, UpdateTeamRequest, AddTeamMemberRequest } from '../services/teamService';
import { userService, User } from '../services/userService';
import { workflowService } from '../services/workflowService';

interface TeamFormData {
  team_id: string;
  name: string;
  description: string;
  department: string;
  max_concurrent_tasks: number;
  specializations: string[];
}

const TeamManagement: React.FC = () => {
  const { t } = useI18n();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [workflowsDialogOpen, setWorkflowsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<TeamFormData>({
    team_id: '',
    name: '',
    description: '',
    department: '',
    max_concurrent_tasks: 10,
    specializations: []
  });

  // Available specializations for teams
  const availableSpecializations = [
    'Catastro', 'RPP', 'Documentos', 'Validación',
    'Revisión Técnica', 'Aprobación Legal', 'Atención Ciudadana',
    'Pagos', 'Notificaciones', 'Auditoría'
  ];

  // Available departments
  const departments = [
    'Catastro', 'Registro Público de la Propiedad', 'IT',
    'Legal', 'Atención Ciudadana', 'Administración', 'Auditoría'
  ];

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teamService.getTeams();
      setTeams(response.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading teams');
    } finally {
      setLoading(false);
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

  const loadWorkflows = async () => {
    try {
      const response = await workflowService.getWorkflows();
      setWorkflows(response.workflows);
    } catch (err) {
      console.error('Error loading workflows:', err);
    }
  };

  const handleCreateTeam = () => {
    setEditingTeam(null);
    setFormData({
      team_id: '',
      name: '',
      description: '',
      department: '',
      max_concurrent_tasks: 10,
      specializations: []
    });
    setDialogOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      team_id: team.team_id,
      name: team.name,
      description: team.description || '',
      department: team.department || '',
      max_concurrent_tasks: team.max_concurrent_tasks,
      specializations: team.specializations
    });
    setDialogOpen(true);
  };

  const handleManageMembers = (team: Team) => {
    setSelectedTeam(team);
    setMembersDialogOpen(true);
  };

  const handleManageWorkflows = (team: Team) => {
    setSelectedTeam(team);
    setWorkflowsDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    try {
      const teamData: CreateTeamRequest = {
        team_id: formData.team_id,
        name: formData.name,
        description: formData.description || undefined,
        department: formData.department || undefined,
        max_concurrent_tasks: formData.max_concurrent_tasks,
        specializations: formData.specializations
      };

      if (editingTeam) {
        await teamService.updateTeam(editingTeam.team_id, {
          name: teamData.name,
          description: teamData.description,
          department: teamData.department,
          max_concurrent_tasks: teamData.max_concurrent_tasks,
          specializations: teamData.specializations
        });
      } else {
        await teamService.createTeam(teamData);
      }
      
      await loadTeams();
      setDialogOpen(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving team');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
  const team = teams.find(t => t.team_id === teamId);
    if (!team) return;

    if (window.confirm(`¿Estás seguro de que quieres eliminar el equipo "${team.name}"?`)) {
      try {
        await teamService.deleteTeam(teamId);
        await loadTeams();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error deleting team');
      }
    }
  };

  const handleAddMember = async (userId: string, role: 'member' | 'leader' | 'coordinator' = 'member') => {
    if (!selectedTeam) return;

    try {
      await teamService.addTeamMember(selectedTeam.team_id, { user_id: userId, role });
      const updatedTeam = await teamService.getTeam(selectedTeam.team_id);
      setSelectedTeam(updatedTeam);
      // Update in teams list
      setTeams(teams => teams.map(t => t.team_id === selectedTeam.team_id ? updatedTeam : t));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;

    try {
      await teamService.removeTeamMember(selectedTeam.team_id, userId);
      const updatedTeam = await teamService.getTeam(selectedTeam.team_id);
      setSelectedTeam(updatedTeam);
      // Update in teams list
      setTeams(teams => teams.map(t => t.team_id === selectedTeam.team_id ? updatedTeam : t));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing member');
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: 'member' | 'leader' | 'coordinator') => {
    if (!selectedTeam) return;

    try {
      await teamService.updateTeamMember(selectedTeam.team_id, userId, { role: newRole });
      const updatedTeam = await teamService.getTeam(selectedTeam.team_id);
      setSelectedTeam(updatedTeam);
      // Update in teams list
      setTeams(teams => teams.map(t => t.team_id === selectedTeam.team_id ? updatedTeam : t));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating member role');
    }
  };

  const handleAssignWorkflow = async (workflowId: string) => {
    if (!selectedTeam) return;

    try {
      await teamService.assignWorkflowToTeam(selectedTeam.team_id, workflowId);
      const updatedTeam = await teamService.getTeam(selectedTeam.team_id);
      setSelectedTeam(updatedTeam);
      // Update in teams list
      setTeams(teams => teams.map(t => t.team_id === selectedTeam.team_id ? updatedTeam : t));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error assigning workflow');
    }
  };

  const handleUnassignWorkflow = async (workflowId: string) => {
    if (!selectedTeam) return;

    try {
      await teamService.unassignWorkflowFromTeam(selectedTeam.team_id, workflowId);
      const updatedTeam = await teamService.getTeam(selectedTeam.team_id);
      setSelectedTeam(updatedTeam);
      // Update in teams list
      setTeams(teams => teams.map(t => t.team_id === selectedTeam.team_id ? updatedTeam : t));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error unassigning workflow');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'member': 'Miembro',
      'leader': 'Líder',
      'coordinator': 'Coordinador'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, any> = {
      'member': 'default',
      'leader': 'primary',
      'coordinator': 'secondary'
    };
    return colors[role] || 'default';
  };

  const getUserById = (userId: string) => {
    return users.find(u => u.id === userId);
  };

  const getNonMemberUsers = () => {
    if (!selectedTeam) return users;
    const memberIds = selectedTeam.members.map(m => m.user_id);
    return users.filter(u => !memberIds.includes(u.id));
  };

  const getAssignedWorkflows = () => {
    if (!selectedTeam) return [];
    return workflows.filter(w => selectedTeam.assigned_workflows.includes(w.workflow_id));
  };

  const getUnassignedWorkflows = () => {
    if (!selectedTeam) return workflows;
    return workflows.filter(w => !selectedTeam.assigned_workflows.includes(w.workflow_id));
  };

  const getWorkflowById = (workflowId: string) => {
    return workflows.find(w => w.workflow_id === workflowId);
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
      await Promise.all([loadUsers(), loadWorkflows()]);
      await loadTeams();
    };
    loadData();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            👥 Gestión de Equipos
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Organiza usuarios en equipos de trabajo para optimizar la asignación de tareas
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadTeams}
            disabled={loading}
          >
            {t('refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateTeam}
          >
            Crear Equipo
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
            Equipos de Trabajo ({teams.length} total)
          </Typography>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Equipo</TableCell>
                  <TableCell>Departamento</TableCell>
                  <TableCell>Miembros</TableCell>
                  <TableCell>Especialidades</TableCell>
                  <TableCell>Workflows</TableCell>
                  <TableCell>Capacidad</TableCell>
                  <TableCell>{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.team_id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GroupIcon color="primary" />
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {team.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {team.team_id}
                          </Typography>
                          {!team.is_active && (
                            <Chip label="Inactivo" size="small" color="error" sx={{ ml: 1 }} />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {team.department || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {team.active_member_count} activos
                        </Typography>
                        {team.leader_count > 0 && (
                          <Chip
                            icon={<LeaderIcon />}
                            label={`${team.leader_count} líder${team.leader_count > 1 ? 'es' : ''}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {team.specializations.slice(0, 2).map((spec) => (
                          <Chip
                            key={spec}
                            label={spec}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {team.specializations.length > 2 && (
                          <Chip
                            label={`+${team.specializations.length - 2}`}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WorkflowIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {team.assigned_workflows.length} asignados
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {team.max_concurrent_tasks} tareas max
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Gestionar Miembros">
                          <IconButton
                            size="small"
                            onClick={() => handleManageMembers(team)}
                            color="info"
                          >
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Gestionar Workflows">
                          <IconButton
                            size="small"
                            onClick={() => handleManageWorkflows(team)}
                            color="secondary"
                          >
                            <WorkflowIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('edit')}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditTeam(team)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('delete')}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteTeam(team.team_id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {teams.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No hay equipos disponibles
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create/Edit Team Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTeam ? 'Editar Equipo' : 'Crear Equipo'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {!editingTeam && (
              <TextField
                fullWidth
                label="ID del Equipo"
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                required
                helperText="Identificador único del equipo (ej: equipo_catastro_01)"
                sx={{ mb: 2 }}
              />
            )}
            <TextField
              fullWidth
              label="Nombre del Equipo"
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
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Departamento</InputLabel>
              <Select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                label="Departamento"
              >
                <MenuItem value="">Sin departamento</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Máximo de Tareas Concurrentes"
              value={formData.max_concurrent_tasks}
              onChange={(e) => setFormData({ ...formData, max_concurrent_tasks: parseInt(e.target.value) })}
              inputProps={{ min: 1, max: 100 }}
              sx={{ mb: 2 }}
            />
            <Autocomplete
              multiple
              options={availableSpecializations}
              value={formData.specializations}
              onChange={(_, newSpecializations) => 
                setFormData({ 
                  ...formData, 
                  specializations: newSpecializations 
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Especialidades del Equipo"
                  placeholder="Seleccionar especialidades..."
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
            onClick={handleSaveTeam}
            disabled={!formData.name.trim() || (!editingTeam && !formData.team_id.trim())}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Members Management Dialog */}
      <Dialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Gestionar Miembros: {selectedTeam?.name}
        </DialogTitle>
        <DialogContent>
          {selectedTeam && (
            <Box sx={{ mt: 2 }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label={`Miembros Actuales (${selectedTeam.members.length})`} />
                <Tab label="Agregar Miembros" />
              </Tabs>

              {activeTab === 0 && (
                <Box sx={{ mt: 2 }}>
                  <List>
                    {selectedTeam.members.map((member) => {
                      const user = getUserById(member.user_id);
                      return (
                        <ListItem key={member.user_id}>
                          <ListItemIcon>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={user?.full_name || 'Usuario no encontrado'}
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  {user?.email} • Unido: {formatDate(member.joined_at)}
                                </Typography>
                                <Box sx={{ mt: 0.5 }}>
                                  <Chip
                                    label={getRoleLabel(member.role)}
                                    size="small"
                                    color={getRoleColor(member.role)}
                                    sx={{ mr: 1 }}
                                  />
                                  {!member.is_active && (
                                    <Chip label="Inactivo" size="small" color="error" />
                                  )}
                                </Box>
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <FormControl size="small" sx={{ mr: 1, minWidth: 120 }}>
                              <Select
                                value={member.role}
                                onChange={(e) => handleUpdateMemberRole(member.user_id, e.target.value as any)}
                                size="small"
                              >
                                <MenuItem value="member">Miembro</MenuItem>
                                <MenuItem value="leader">Líder</MenuItem>
                                <MenuItem value="coordinator">Coordinador</MenuItem>
                              </Select>
                            </FormControl>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveMember(member.user_id)}
                              color="error"
                            >
                              <PersonRemoveIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                    {selectedTeam.members.length === 0 && (
                      <ListItem>
                        <ListItemText
                          primary="No hay miembros en este equipo"
                          secondary="Usa la pestaña 'Agregar Miembros' para añadir usuarios"
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Usuarios Disponibles
                  </Typography>
                  <List>
                    {getNonMemberUsers().map((user) => (
                      <ListItem key={user.id}>
                        <ListItemIcon>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {user.full_name.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={user.full_name}
                          secondary={`${user.email} • ${user.role} • ${user.department || 'Sin departamento'}`}
                        />
                        <ListItemSecondaryAction>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleAddMember(user.id, 'member')}
                            startIcon={<PersonAddIcon />}
                          >
                            Agregar
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                    {getNonMemberUsers().length === 0 && (
                      <ListItem>
                        <ListItemText
                          primary="No hay usuarios disponibles"
                          secondary="Todos los usuarios ya son miembros de este equipo"
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Workflows Management Dialog */}
      <Dialog
        open={workflowsDialogOpen}
        onClose={() => setWorkflowsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Gestionar Workflows: {selectedTeam?.name}
        </DialogTitle>
        <DialogContent>
          {selectedTeam && (
            <Box sx={{ mt: 2 }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label={`Workflows Asignados (${getAssignedWorkflows().length})`} />
                <Tab label="Asignar Workflows" />
              </Tabs>

              {activeTab === 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Workflows Actualmente Asignados
                  </Typography>
                  <List>
                    {getAssignedWorkflows().map((workflow) => (
                      <ListItem key={workflow.workflow_id}>
                        <ListItemIcon>
                          <WorkflowIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={workflow.name}
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                ID: {workflow.workflow_id} • Versión: {workflow.version}
                              </Typography>
                              {workflow.description && (
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {workflow.description}
                                </Typography>
                              )}
                              <Box sx={{ mt: 0.5 }}>
                                {workflow.category && (
                                  <Chip
                                    label={workflow.category}
                                    size="small"
                                    variant="outlined"
                                    sx={{ mr: 1 }}
                                  />
                                )}
                                <Chip
                                  label={`${workflow.steps?.length || 0} pasos`}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleUnassignWorkflow(workflow.workflow_id)}
                            startIcon={<DeleteIcon />}
                          >
                            Desasignar
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                    {getAssignedWorkflows().length === 0 && (
                      <ListItem>
                        <ListItemText
                          primary="No hay workflows asignados"
                          secondary="Usa la pestaña 'Asignar Workflows' para asignar workflows a este equipo"
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Workflows Disponibles para Asignar
                  </Typography>
                  <List>
                    {getUnassignedWorkflows().map((workflow) => (
                      <ListItem key={workflow.workflow_id}>
                        <ListItemIcon>
                          <WorkflowIcon color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary={workflow.name}
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                ID: {workflow.workflow_id} • Versión: {workflow.version}
                              </Typography>
                              {workflow.description && (
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {workflow.description}
                                </Typography>
                              )}
                              <Box sx={{ mt: 0.5 }}>
                                {workflow.category && (
                                  <Chip
                                    label={workflow.category}
                                    size="small"
                                    variant="outlined"
                                    sx={{ mr: 1 }}
                                  />
                                )}
                                <Chip
                                  label={`${workflow.steps?.length || 0} pasos`}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleAssignWorkflow(workflow.workflow_id)}
                            startIcon={<AddIcon />}
                          >
                            Asignar
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                    {getUnassignedWorkflows().length === 0 && (
                      <ListItem>
                        <ListItemText
                          primary="No hay workflows disponibles para asignar"
                          secondary="Todos los workflows ya están asignados a este equipo"
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkflowsDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamManagement;