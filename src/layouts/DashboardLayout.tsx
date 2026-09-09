import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AccountTree as WorkflowIcon,
  Timeline as InstanceIcon,
  Inbox as InboxIcon,
  Description as DocumentIcon,
  Analytics as AnalyticsIcon,
  Notifications as NotificationIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Storage as CatalogIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

const drawerWidth = 240;

const menuItems = [
  { text: 'dashboard', path: '/dashboard', icon: <DashboardIcon /> }, // Always show dashboard
  { text: 'workflows', path: '/workflows', icon: <WorkflowIcon />, permission: 'view_workflows' },
  { text: 'citizenTracking', path: '/instances', icon: <InstanceIcon />, permission: 'view_instances' },
  { text: 'instanceAssignments', path: '/instance-assignments', icon: <AssignmentIcon />, permission: 'view_instances' },
  { text: 'nav.catalogs', path: '/catalogs', icon: <CatalogIcon />, permission: 'admin_system' },
  { text: 'nav.profileFields', path: '/profile-fields', icon: <PersonIcon />, permission: 'admin_system' },
  { text: 'divider' }, // Visual separator for admin section
  {
    text: 'nav.notifications',
    icon: <NotificationIcon />,
    permission: 'manage_integrations',
    children: [
      { text: 'nav.configuration', path: '/admin/integrations/notifications', icon: <SettingsIcon /> },
      { text: 'nav.templates', path: '/admin/integrations/templates', icon: <DocumentIcon /> },
      { text: 'nav.deliveries', path: '/admin/notifications/deliveries', icon: <SendIcon /> },
    ],
  },
  { text: 'nav.keycloakStats', path: '/admin/keycloak', icon: <SecurityIcon />, permission: 'admin_system' },
];

function DashboardLayout() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission, hasAnyRole } = useAuth();

  const isGroupOpen = (item: any): boolean => {
    if (openGroups[item.text] !== undefined) return openGroups[item.text];
    return item.children?.some((c: any) => location.pathname.startsWith(c.path)) ?? false;
  };

  const toggleGroup = (text: string) => {
    setOpenGroups((prev) => ({ ...prev, [text]: !isGroupOpenByText(text) }));
  };

  const isGroupOpenByText = (text: string): boolean => {
    const item = menuItems.find((m: any) => m.text === text);
    return item ? isGroupOpen(item) : false;
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleProfileMenuClose();
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          🏛️ MuniStream
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item: any, index) => {
          // Handle divider
          if (item.text === 'divider') {
            return <Divider key={`divider-${index}`} sx={{ my: 1 }} />;
          }

          // Check permissions and roles
          const hasRequiredPermission = !item.permission || hasPermission(item.permission);
          const hasRequiredRole = !item.roles || hasAnyRole(item.roles);

          // Only show item if user has permission/role
          if (!hasRequiredPermission || !hasRequiredRole) {
            return null;
          }

          // Group with children
          if (item.children) {
            const open = isGroupOpen(item);
            return (
              <Box key={item.text}>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => toggleGroup(item.text)}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={t(item.text)} />
                    {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={open} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child: any) => (
                      <ListItemButton
                        key={child.path}
                        sx={{ pl: 4 }}
                        selected={location.pathname === child.path}
                        onClick={() => navigate(child.path)}
                      >
                        <ListItemIcon>{child.icon}</ListItemIcon>
                        <ListItemText primary={t(child.text)} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </Box>
            );
          }

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText primary={t(item.text)} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          // MUI v7 pinta la barra con `background-color: var(--AppBar-background)`
          // y esa variable no llega a definirse con este tema, así que la barra
          // quedaba transparente y el contenido se veía pasar por debajo al
          // hacer scroll. Se fija el color explícitamente, que además es el que
          // el propio tema declara para la cabecera.
          '--AppBar-background': (theme) => theme.palette.primary.main,
          '--AppBar-color': (theme) => theme.palette.primary.contrastText,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('nav.appTitle')}
          </Typography>

          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={3} color="error">
              <NotificationIcon />
            </Badge>
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {user && (
              <>
                <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>
                  {user.full_name}
                </Typography>
                <Chip
                  label={user.role}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ display: { xs: 'none', md: 'flex' } }}
                />
              </>
            )}
            
            <IconButton
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant="body2">{user?.full_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { navigate('/profile'); handleProfileMenuClose(); }}>
              <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
              {t('nav.profile')}
            </MenuItem>
            <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              {t('nav.settings')}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              {t('nav.logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          maxWidth: '100%',
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default DashboardLayout;