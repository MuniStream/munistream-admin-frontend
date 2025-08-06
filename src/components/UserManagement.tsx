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
  Switch,
  FormControlLabel,
  Avatar,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Autocomplete,
  CheckboxProps,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  VpnKey as PermissionIcon,
  Security as RoleIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useI18n } from '../contexts/I18nContext';
import { userService, User, CreateUserRequest, UpdateUserRequest } from '../services/userService';

interface UserFormData {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role: 'admin' | 'manager' | 'reviewer' | 'approver' | 'viewer';
  department: string;
  phone: string;
  email_notifications: boolean;
  two_factor_enabled: boolean;
  permissions: string[];
}

// Available permissions mapping
const PERMISSIONS = {
  'view_documents': 'Ver Documentos',
  'verify_documents': 'Verificar Documentos',
  'approve_documents': 'Aprobar Documentos',
  'delete_documents': 'Eliminar Documentos',
  'view_workflows': 'Ver Workflows',
  'manage_workflows': 'Gestionar Workflows',
  'execute_workflows': 'Ejecutar Workflows',
  'manage_users': 'Gestionar Usuarios',
  'view_analytics': 'Ver Analíticas',
  'manage_system': 'Gestionar Sistema',
  'view_instances': 'Ver Instancias',
  'manage_instances': 'Gestionar Instancias'
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
  'admin': [
    'view_documents', 'verify_documents', 'approve_documents', 'delete_documents',
    'view_workflows', 'manage_workflows', 'execute_workflows',
    'manage_users', 'view_analytics', 'manage_system',
    'view_instances', 'manage_instances'
  ],
  'manager': [
    'view_documents', 'verify_documents', 'approve_documents',
    'view_workflows', 'execute_workflows', 'view_analytics',
    'view_instances', 'manage_instances'
  ],
  'reviewer': [
    'view_documents', 'verify_documents',
    'view_workflows', 'view_instances'
  ],
  'approver': [
    'view_documents', 'approve_documents',
    'view_workflows', 'execute_workflows', 'view_instances'
  ],
  'viewer': [
    'view_documents', 'view_workflows', 'view_instances', 'view_analytics'
  ]
};

const UserManagement: React.FC = () => {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    username: '',
    full_name: '',
    password: '',
    role: 'viewer',
    department: '',
    phone: '',
    email_notifications: true,
    two_factor_enabled: false,
    permissions: []
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const users = await userService.getUsers();
      setUsers(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      username: '',
      full_name: '',
      password: '',
      role: 'viewer',
      department: '',
      phone: '',
      email_notifications: true,
      two_factor_enabled: false,
      permissions: []
    });
    setDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      password: '', // Don't populate password for edits
      role: user.role,
      department: user.department || '',
      phone: user.phone || '',
      email_notifications: user.email_notifications,
      two_factor_enabled: user.two_factor_enabled,
      permissions: user.permissions || []
    });
    setDialogOpen(true);
  };

  const handleManagePermissions = (user: User) => {
    setSelectedUser(user);
    setPermissionsDialogOpen(true);
  };

  const handleRoleChange = (newRole: string) => {
    const rolePermissions = ROLE_PERMISSIONS[newRole as keyof typeof ROLE_PERMISSIONS] || [];
    setFormData({
      ...formData,
      role: newRole as any,
      permissions: rolePermissions
    });
  };

  const handlePermissionToggle = (permission: string) => {
    const currentPermissions = formData.permissions;
    const hasPermission = currentPermissions.includes(permission);
    
    if (hasPermission) {
      setFormData({
        ...formData,
        permissions: currentPermissions.filter(p => p !== permission)
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...currentPermissions, permission]
      });
    }
  };

  const handleUpdateUserPermissions = async (userId: string, permissions: string[]) => {
    try {
      await userService.updateUser(userId, { permissions });
      await loadUsers();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating permissions');
    }
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        // Update existing user
        const updateData: UpdateUserRequest = {
          full_name: formData.full_name,
          role: formData.role,
          department: formData.department || undefined,
          phone: formData.phone || undefined,
          email_notifications: formData.email_notifications,
          permissions: formData.permissions
        };
        await userService.updateUser(editingUser.id, updateData);
      } else {
        // Create new user
        const createData: CreateUserRequest = {
          email: formData.email,
          username: formData.username,
          full_name: formData.full_name,
          password: formData.password,
          role: formData.role,
          department: formData.department || undefined,
          phone: formData.phone || undefined
        };
        await userService.createUser(createData);
        
        // Update permissions after creation if needed
        if (formData.permissions.length > 0) {
          // We'll need to get the created user ID to update permissions
          // For now, we'll reload and handle this in a separate operation
        }
      }
      
      // Reload users from database
      await loadUsers();
      setDialogOpen(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving user');
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await userService.updateUser(userId, { status: newStatus });
      
      // Reload users from database
      await loadUsers();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      try {
        await userService.deleteUser(userId);
        
        // Reload users from database
        await loadUsers();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error deleting user');
      }
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      'active': 'success',
      'inactive': 'default',
      'suspended': 'error',
      'pending': 'warning'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'active': 'Activo',
      'inactive': 'Inactivo',
      'suspended': 'Suspendido',
      'pending': 'Pendiente'
    };
    return labels[status] || status;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'admin': 'Administrador',
      'manager': 'Gerente',
      'reviewer': 'Revisor',
      'approver': 'Aprobador',
      'viewer': 'Visualizador'
    };
    return labels[role] || role;
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
    loadUsers();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            👥 Gestión de Usuarios
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Administra usuarios del sistema y sus permisos
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadUsers}
            disabled={loading}
          >
            {t('refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateUser}
          >
            Crear Usuario
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
            Usuarios del Sistema ({users.length} total)
          </Typography>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Departamento</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Permisos</TableCell>
                  <TableCell>Último Acceso</TableCell>
                  <TableCell>{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          src={user.avatar_url}
                          sx={{ width: 40, height: 40 }}
                        >
                          {user.full_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {user.full_name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <EmailIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                          {user.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PhoneIcon fontSize="small" color="action" />
                              <Typography variant="caption" color="text.secondary">
                                {user.phone}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.department || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(user.status)}
                        color={getStatusColor(user.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PermissionIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {user.permissions?.length || 0} permisos
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleManagePermissions(user)}
                          startIcon={<RoleIcon />}
                        >
                          Gestionar
                        </Button>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title={t('edit')}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.status === 'active' ? 'Suspender' : 'Activar'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleUserStatus(user.id)}
                            color={user.status === 'active' ? 'warning' : 'success'}
                          >
                            {user.status === 'active' ? 
                              <BlockIcon fontSize="small" /> : 
                              <ActivateIcon fontSize="small" />
                            }
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('delete')}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(user.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No hay usuarios disponibles
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingUser ? 'Editar Usuario' : 'Crear Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Nombre Completo"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Usuario"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={!!editingUser} // Disable username editing
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={!!editingUser} // Disable email editing
              sx={{ mb: 2 }}
            />
            {!editingUser && (
              <TextField
                fullWidth
                label="Contraseña"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                sx={{ mb: 2 }}
              />
            )}
            <TextField
              fullWidth
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Rol</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                label="Rol"
              >
                <MenuItem value="viewer">Visualizador</MenuItem>
                <MenuItem value="reviewer">Revisor</MenuItem>
                <MenuItem value="approver">Aprobador</MenuItem>
                <MenuItem value="manager">Gerente</MenuItem>
                <MenuItem value="admin">Administrador</MenuItem>
              </Select>
            </FormControl>
            
            {/* Permissions Section */}
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Permisos del Rol: {getRoleLabel(formData.role)}
            </Typography>
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.permissions.map((permission) => (
                  <Chip
                    key={permission}
                    label={PERMISSIONS[permission as keyof typeof PERMISSIONS] || permission}
                    size="small"
                    color="primary"
                    variant="outlined"
                    onDelete={() => handlePermissionToggle(permission)}
                  />
                ))}
                {formData.permissions.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Sin permisos asignados
                  </Typography>
                )}
              </Box>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom>
              Permisos Adicionales (Opcionales)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, mb: 2 }}>
              {Object.entries(PERMISSIONS).map(([permission, label]) => (
                <FormControlLabel
                  key={permission}
                  control={
                    <Checkbox
                      checked={formData.permissions.includes(permission)}
                      onChange={() => handlePermissionToggle(permission)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption">
                      {label}
                    </Typography>
                  }
                />
              ))}
            </Box>
            <TextField
              fullWidth
              label="Departamento"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.email_notifications}
                  onChange={(e) => setFormData({ ...formData, email_notifications: e.target.checked })}
                />
              }
              label="Notificaciones por Email"
              sx={{ mb: 1, display: 'block' }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.two_factor_enabled}
                  onChange={(e) => setFormData({ ...formData, two_factor_enabled: e.target.checked })}
                />
              }
              label="Autenticación de Dos Factores"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveUser}
            disabled={!formData.full_name.trim() || !formData.email.trim() || !formData.username.trim() || (!editingUser && !formData.password.trim())}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Management Dialog */}
      <Dialog
        open={permissionsDialogOpen}
        onClose={() => setPermissionsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AdminIcon color="primary" />
            Gestionar Permisos: {selectedUser?.full_name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Información del Usuario
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Avatar>
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedUser.full_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedUser.email} • {getRoleLabel(selectedUser.role)}
                    </Typography>
                    <Chip
                      label={`${selectedUser.permissions?.length || 0} permisos activos`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Box>
              </Box>

              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label="Permisos por Rol" />
                <Tab label="Permisos Personalizados" />
                <Tab label="Resumen" />
              </Tabs>

              {activeTab === 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Permisos Estándar del Rol: {getRoleLabel(selectedUser.role)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Estos son los permisos base que tiene el rol {getRoleLabel(selectedUser.role).toLowerCase()}:
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                    {ROLE_PERMISSIONS[selectedUser.role]?.map((permission) => (
                      <Box key={permission} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
                        <PermissionIcon fontSize="small" color="success" />
                        <Typography variant="body2">
                          {PERMISSIONS[permission as keyof typeof PERMISSIONS] || permission}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Permisos Adicionales
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Marca o desmarca permisos adicionales para este usuario específico:
                  </Typography>
                  <List>
                    {Object.entries(PERMISSIONS).map(([permission, label]) => {
                      const hasPermission = selectedUser.permissions?.includes(permission) || false;
                      const isRolePermission = ROLE_PERMISSIONS[selectedUser.role]?.includes(permission) || false;
                      
                      return (
                        <ListItem key={permission}>
                          <ListItemIcon>
                            <Checkbox
                              checked={hasPermission}
                              onChange={async (e) => {
                                const newPermissions = e.target.checked
                                  ? [...(selectedUser.permissions || []), permission]
                                  : (selectedUser.permissions || []).filter(p => p !== permission);
                                
                                await handleUpdateUserPermissions(selectedUser.id, newPermissions);
                                setSelectedUser({
                                  ...selectedUser,
                                  permissions: newPermissions
                                });
                              }}
                              disabled={isRolePermission}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={label}
                            secondary={
                              isRolePermission 
                                ? `Incluido en el rol ${getRoleLabel(selectedUser.role)}`
                                : 'Permiso adicional'
                            }
                          />
                          {isRolePermission && (
                            <Chip label="Rol" size="small" color="default" variant="outlined" />
                          )}
                          {hasPermission && !isRolePermission && (
                            <Chip label="Personalizado" size="small" color="primary" variant="outlined" />
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}

              {activeTab === 2 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Resumen de Permisos
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Permisos efectivos del usuario (rol + personalizados):
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {Array.from(new Set([
                        ...(ROLE_PERMISSIONS[selectedUser.role] || []),
                        ...(selectedUser.permissions || [])
                      ])).map((permission) => {
                        const isRolePermission = ROLE_PERMISSIONS[selectedUser.role]?.includes(permission);
                        const isCustomPermission = selectedUser.permissions?.includes(permission);
                        
                        return (
                          <Chip
                            key={permission}
                            label={PERMISSIONS[permission as keyof typeof PERMISSIONS] || permission}
                            size="small"
                            color={isCustomPermission && !isRolePermission ? "secondary" : "primary"}
                            variant={isRolePermission ? "filled" : "outlined"}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Estadísticas:</strong>
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                      <Typography variant="h6" color="primary.contrastText">
                        {ROLE_PERMISSIONS[selectedUser.role]?.length || 0}
                      </Typography>
                      <Typography variant="caption" color="primary.contrastText">
                        Permisos del Rol
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'secondary.light', borderRadius: 1 }}>
                      <Typography variant="h6" color="secondary.contrastText">
                        {(selectedUser.permissions || []).filter(p => !ROLE_PERMISSIONS[selectedUser.role]?.includes(p)).length}
                      </Typography>
                      <Typography variant="caption" color="secondary.contrastText">
                        Permisos Adicionales
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="h6" color="success.contrastText">
                        {Array.from(new Set([
                          ...(ROLE_PERMISSIONS[selectedUser.role] || []),
                          ...(selectedUser.permissions || [])
                        ])).length}
                      </Typography>
                      <Typography variant="caption" color="success.contrastText">
                        Total Efectivo
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionsDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;