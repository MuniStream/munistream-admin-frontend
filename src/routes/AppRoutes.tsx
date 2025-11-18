import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardEnhanced from '@/pages/DashboardEnhanced';
import WorkflowsDashboard from '@/pages/WorkflowsDashboard';
import WorkflowDetail from '@/pages/WorkflowDetail';
import InstanceTracking from '@/pages/InstanceTracking';
import InstanceDetail from '@/pages/InstanceDetail';
import CitizenValidation from '@/pages/CitizenValidation';
import WorkflowManagementPage from '@/pages/WorkflowManagementPage';
import InstanceAssignmentPage from '@/pages/InstanceAssignmentPage';
import { AdminWorkflowExecution } from '@/pages/AdminWorkflowExecution';
import KeycloakStats from '@/pages/admin/KeycloakStats';
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
          path="workflow-management"
          element={
            <ProtectedRoute requiredPermission="manage_workflows">
              <WorkflowManagementPage />
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

      </Route>
    </Routes>
  );
}

export default AppRoutes;