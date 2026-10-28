import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardEnhanced from '@/pages/DashboardEnhanced';
import WorkflowsDashboard from '@/pages/WorkflowsDashboard';
import WorkflowDetail from '@/pages/WorkflowDetail';
import AnalyticsPage from '@/pages/AnalyticsPage';
import TramitesPage from '@/pages/TramitesPage';
import EntitiesPage from '@/pages/EntitiesPage';
import MyInboxPage from '@/pages/MyInboxPage';
import InstanceDetail from '@/pages/InstanceDetail';
import KeycloakStats from '@/pages/admin/KeycloakStats';
import CatalogsPage from '@/pages/CatalogsPage';
import ProfileFieldsPage from '@/pages/ProfileFieldsPage';
import NotificationIntegrations from '@/pages/admin/NotificationIntegrations';
import NotificationTemplates from '@/pages/admin/NotificationTemplates';
import NotificationDeliveries from '@/pages/admin/NotificationDeliveries';
import Login from '@/pages/Login';
import ProtectedRoute from '@/components/ProtectedRoute';
import { HOME_PATH, PERMISSIONS } from '@/auth/permissions';

/** Redirige la ruta antigua del expediente a la nueva, conservando el id. */
function RedirectToInstance() {
  const { instanceId } = useParams();
  return <Navigate to={`/instances/${instanceId}`} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* "My inbox" is the landing page for every staff member. */}
        <Route index element={<Navigate to={HOME_PATH} replace />} />
        
        <Route
          path="dashboard"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_ANALYTICS}>
              <DashboardEnhanced />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="workflows"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_WORKFLOWS}>
              <WorkflowsDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="workflows/:workflowId"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_WORKFLOWS}>
              <WorkflowDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="analytics"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_SYSTEM}>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="instances"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_INSTANCES}>
              <TramitesPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="entities"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_INSTANCES}>
              <EntitiesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="instances/:instanceId"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_INSTANCES}>
              <InstanceDetail />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="my-inbox"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_INSTANCES}>
              <MyInboxPage />
            </ProtectedRoute>
          }
        />

        {/* Ruta anterior del expediente. Se conserva como redirección porque
            hay marcadores guardados y el arnés E2E la tiene cableada. */}
        <Route
          path="admin-workflow/:instanceId"
          element={<RedirectToInstance />}
        />

        <Route
          path="catalogs"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_SYSTEM}>
              <CatalogsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="profile-fields"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_SYSTEM}>
              <ProfileFieldsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/keycloak"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN_SYSTEM}>
              <KeycloakStats />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/integrations/notifications"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_INTEGRATIONS}>
              <NotificationIntegrations />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/integrations/templates"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_INTEGRATIONS}>
              <NotificationTemplates />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/notifications/deliveries"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_INTEGRATIONS}>
              <NotificationDeliveries />
            </ProtectedRoute>
          }
        />

        {/* Unknown routes land on the inbox instead of a blank page. */}
        <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;