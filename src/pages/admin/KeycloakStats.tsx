import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material'
import {
  Security as SecurityIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  ManageAccounts as ManagerIcon,
  RateReview as ReviewerIcon,
  CheckCircle as ApproverIcon,
  Visibility as ViewerIcon,
  People as PeopleIcon
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import keycloakService from '../../services/keycloak'

interface KeycloakStats {
  users: {
    total: number
    active: number
    inactive: number
    byRole: Record<string, number>
  }
  groups: {
    total: number
    list: Array<{
      name: string
      memberCount: number
      description?: string
    }>
  }
  roles: {
    total: number
    list: Array<{
      name: string
      userCount: number
      description?: string
    }>
  }
}

const KeycloakStats: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<KeycloakStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is admin
  const isAdmin = user?.role === 'admin'

  // Fetch Keycloak statistics
  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = keycloakService.getToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch('/api/v1/admin/keycloak/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Error fetching stats: ${response.statusText}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener estadísticas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchStats()
    }
  }, [isAdmin])

  // Get role icon and color
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return { icon: <AdminIcon />, color: 'error', label: 'Admin' }
      case 'manager':
        return { icon: <ManagerIcon />, color: 'warning', label: 'Manager' }
      case 'reviewer':
        return { icon: <ReviewerIcon />, color: 'info', label: 'Revisor' }
      case 'approver':
        return { icon: <ApproverIcon />, color: 'success', label: 'Aprobador' }
      case 'viewer':
        return { icon: <ViewerIcon />, color: 'default', label: 'Visor' }
      case 'citizen':
        return { icon: <PeopleIcon />, color: 'primary', label: 'Ciudadano' }
      default:
        return { icon: <PersonIcon />, color: 'default', label: role }
    }
  }

  if (!isAdmin) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Acceso denegado. Solo los administradores pueden ver las estadísticas de Keycloak.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Paper sx={{ p: 3, width: '100%', minWidth: 0 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1">
              Estadísticas de Keycloak
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : stats ? (
          <>
            {/* User Statistics */}
            <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon />
              Usuarios
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary">
                      {stats.users.total}
                    </Typography>
                    <Typography variant="body2">Total Usuarios</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="success.main">
                      {stats.users.active}
                    </Typography>
                    <Typography variant="body2">Activos</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="error">
                      {stats.users.inactive}
                    </Typography>
                    <Typography variant="body2">Inactivos</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="info.main">
                      {Object.keys(stats.users.byRole).length}
                    </Typography>
                    <Typography variant="body2">Roles Diferentes</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Users by Role */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Distribución por Roles
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {Object.entries(stats.users.byRole).map(([role, count]) => {
                const roleDisplay = getRoleDisplay(role)
                const percentage = stats.users.total > 0 ? ((count / stats.users.total) * 100).toFixed(1) : '0'
                return (
                  <Grid item xs={12} sm={6} md={4} key={role}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                          {roleDisplay.icon}
                          <Typography variant="h6">{roleDisplay.label}</Typography>
                        </Box>
                        <Typography variant="h4" color={`${roleDisplay.color}.main`}>
                          {count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {percentage}% del total
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>

            {/* Groups Statistics */}
            <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupIcon />
              Grupos/Equipos
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary">
                      {stats.groups.total}
                    </Typography>
                    <Typography variant="body2">Total Grupos/Equipos</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="info.main">
                      {stats.groups.list.reduce((sum, group) => sum + group.memberCount, 0)}
                    </Typography>
                    <Typography variant="body2">Total Miembros</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="success.main">
                      {stats.groups.list.filter(group => group.memberCount > 0).length}
                    </Typography>
                    <Typography variant="body2">Grupos Activos</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Group Distribution */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Distribución por Grupos
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {stats.groups.list.slice(0, 6).map((group, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h6" noWrap>
                        {group.name}
                      </Typography>
                      <Typography variant="h4" color="primary.main">
                        {group.memberCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        miembros
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Groups Table */}
            {stats.groups.list.length > 0 && (
              <>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Grupos Activos
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, width: '100%' }}>
                  <Table sx={{ width: '100%' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nombre del Grupo</TableCell>
                        <TableCell align="center">Miembros</TableCell>
                        <TableCell>Descripción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.groups.list.map((group, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {group.name}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={group.memberCount}
                              color="primary"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {group.description || 'Sin descripción'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Roles Statistics */}
            <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon />
              Roles del Sistema
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary">
                      {stats.roles.total}
                    </Typography>
                    <Typography variant="body2">Total Roles</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="warning.main">
                      {stats.roles.list.filter(role => role.userCount > 0).length}
                    </Typography>
                    <Typography variant="body2">Roles en Uso</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        ) : null}
      </Paper>
    </Box>
  )
}

export default KeycloakStats