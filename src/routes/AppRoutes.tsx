import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardEnhanced from '@/pages/DashboardEnhanced';
import WorkflowsDashboard from '@/pages/WorkflowsDashboard';
import WorkflowDetail from '@/pages/WorkflowDetail';
import InstanceTracking from '@/pages/InstanceTracking';
import InstanceDetail from '@/pages/InstanceDetail';
import CitizenValidation from '@/pages/CitizenValidation';
import InstanceAssignmentPage from '@/pages/InstanceAssignmentPage';
import { AdminWorkflowExecution } from '@/pages/AdminWorkflowExecution';
import KeycloakStats from '@/pages/admin/KeycloakStats';
import CatalogsPage from '@/pages/CatalogsPage';
import ProfileFieldsPage from '@/pages/ProfileFieldsPage';
import NotificationIntegrations from '@/pages/admin/NotificationIntegrations';
import NotificationTemplates from '@/pages/admin/NotificationTemplates';
import NotificationDeliveries from '@/pages/admin/NotificationDeliveries';
import Login from '@/pages/Login';
import ProtectedRoute from '@/components/ProtectedRoute';

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
          path="instances"
          element={
            <ProtectedRoute requiredPermission="view_instances">
              <InstanceTracking />
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
          path="instance-assignments"
          element={
            <ProtectedRoute requiredPermission="view_instances">
              <InstanceAssignmentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin-workflow/:instanceId"
          element={
            <ProtectedRoute requiredPermission="view_instances">
              <AdminWorkflowExecution />
            </ProtectedRoute>
          }
        />

        <Route
          path="citizen-validation"
          element={
            <ProtectedRoute requiredPermission="manage_instances">
              <CitizenValidation />
            </ProtectedRoute>
          }
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