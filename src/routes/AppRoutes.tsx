import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardEnhanced from '@/pages/DashboardEnhanced';
import WorkflowsDashboard from '@/pages/WorkflowsDashboard';
import WorkflowDetail from '@/pages/WorkflowDetail';
import AnalyticsPage from '@/pages/AnalyticsPage';
import TramitesPage from '@/pages/TramitesPage';
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
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        <Route
          path="dashboard"
          element={
            <ProtectedRoute requiredPermission="view_analytics">
              <DashboardEnhanced />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="workflows"
          element={
            <ProtectedRoute requiredPermission="view_workflows">
              <WorkflowsDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="workflows/:workflowId"
          element={
            <ProtectedRoute requiredPermission="view_workflows">
              <WorkflowDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="analytics"
          element={
            <ProtectedRoute requiredPermission="admin_system">
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="instances"
          element={
            <ProtectedRoute requiredPermission="view_instances">
              <TramitesPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="instances/:instanceId"
          element={
            <ProtectedRoute requiredPermission="view_instances">
              <InstanceDetail />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="my-inbox"
          element={
            <ProtectedRoute requiredPermission="view_instances">
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
            <ProtectedRoute requiredPermission="admin_system">
              <CatalogsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="profile-fields"
          element={
            <ProtectedRoute requiredPermission="admin_system">
              <ProfileFieldsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/keycloak"
          element={
            <ProtectedRoute requiredPermission="admin_system">
              <KeycloakStats />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/integrations/notifications"
          element={
            <ProtectedRoute requiredPermission="manage_integrations">
              <NotificationIntegrations />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/integrations/templates"
          element={
            <ProtectedRoute requiredPermission="manage_integrations">
              <NotificationTemplates />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/notifications/deliveries"
          element={
            <ProtectedRoute requiredPermission="manage_integrations">
              <NotificationDeliveries />
            </ProtectedRoute>
          }
        />

      </Route>
    </Routes>
  );
}

export default AppRoutes;