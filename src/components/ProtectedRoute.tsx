import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  requiredRoles?: string[];
}

function ProtectedRoute({ 
  children, 
  requiredPermission, 
  requiredRole, 
  requiredRoles 
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, loading, hasPermission, hasRole, hasAnyRole } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check permission
  console.log('ProtectedRoute Debug:', {
    requiredPermission,
    hasPermissionResult: hasPermission(requiredPermission),
    isAuthenticated,
    loading
  });

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <Typography variant="h5" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Admin privileges required.
        </Typography>
        <Typography variant="body2" sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          Debug: Required permission '{requiredPermission}' not found.<br/>
          hasPermission result: {String(hasPermission(requiredPermission))}<br/>
          User authenticated: {String(isAuthenticated)}<br/>
          Loading: {String(loading)}
        </Typography>
      </Box>
    );
  }

  // Check single role
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <Typography variant="h5" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page requires {requiredRole} role.
        </Typography>
      </Box>
    );
  }

  // Check multiple roles
  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <Typography variant="h5" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page requires one of these roles: {requiredRoles.join(', ')}.
        </Typography>
      </Box>
    );
  }

  // All checks passed
  return <>{children}</>;
}

export default ProtectedRoute;