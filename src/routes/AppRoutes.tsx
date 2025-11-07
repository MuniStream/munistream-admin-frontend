import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardEnhanced from '@/pages/DashboardEnhanced';
import WorkflowsDashboard from '@/pages/WorkflowsDashboard';
import WorkflowDetail from '@/pages/WorkflowDetail';
import InstanceTracking from '@/pages/InstanceTracking';
import InstanceDetail from '@/pages/InstanceDetail';
import AdminInbox from '@/pages/AdminInbox';
import DocumentManagement from '@/pages/DocumentManagement';
import PerformanceAnalytics from '@/pages/PerformanceAnalytics';
import CitizenValidation from '@/pages/CitizenValidation';
import CategoryManagementPage from '@/pages/CategoryManagementPage';
import UserManagementPage from '@/pages/UserManagementPage';
import WorkflowManagementPage from '@/pages/WorkflowManagementPage';
import TeamManagementPage from '@/pages/TeamManagementPage';
import InstanceAssignmentPage from '@/pages/InstanceAssignmentPage';
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
          path="inbox"
          element={
            <ProtectedRoute requiredRoles={['admin', 'manager', 'approver']}>
              <AdminInbox />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="documents"
          element={
            <ProtectedRoute requiredPermission="view_documents">
              <DocumentManagement />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="analytics"
          element={
            <ProtectedRoute requiredPermission="view_analytics">
              <PerformanceAnalytics />
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
          path="categories"
          element={
            <ProtectedRoute requiredPermission="manage_workflows">
              <CategoryManagementPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="users"
          element={
            <ProtectedRoute requiredRoles={['admin']}>
              <UserManagementPage />
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
          path="teams"
          element={
            <ProtectedRoute requiredPermission="manage_users">
              <TeamManagementPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default AppRoutes;