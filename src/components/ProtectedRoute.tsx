import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { HOME_PATH } from '@/auth/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  requiredRoles?: string[];
}

function Denied({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      textAlign="center"
      gap={1}
      px={2}
    >
      <Typography variant="h5" color="error">
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520 }}>
        {detail}
      </Typography>
      {action}
    </Box>
  );
}

function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  requiredRoles
}: ProtectedRouteProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, logout, hasPermission, hasRole, hasAnyRole } = useAuth();

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
          {t('loading')}
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Signed in but without any staff role (e.g. a citizen account): nothing in
  // the portal is available to them.
  if (!user?.permissions?.length) {
    return (
      <Denied
        title={t('misc.noPortalAccess')}
        detail={t('misc.noPortalAccessHint')}
        action={
          <Button variant="outlined" sx={{ mt: 2 }} onClick={() => logout()}>
            {t('nav.logout')}
          </Button>
        }
      />
    );
  }

  const goHome = (
    <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate(HOME_PATH)}>
      {t('misc.goToInbox')}
    </Button>
  );

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Denied title={t('misc.accessDenied')} detail={t('misc.permissionDenied')} action={goHome} />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <Denied
        title={t('misc.accessDenied')}
        detail={t('misc.requiresRole', { role: requiredRole })}
        action={goHome}
      />
    );
  }

  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return (
      <Denied
        title={t('misc.accessDenied')}
        detail={t('misc.requiresRoles', { roles: requiredRoles.join(', ') })}
        action={goHome}
      />
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
