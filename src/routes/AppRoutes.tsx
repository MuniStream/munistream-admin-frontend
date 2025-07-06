import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import Dashboard from '@/pages/Dashboard';
import WorkflowsDashboard from '@/pages/WorkflowsDashboard';
import WorkflowDetail from '@/pages/WorkflowDetail';
import InstanceTracking from '@/pages/InstanceTracking';
import InstanceDetail from '@/pages/InstanceDetail';
import AdminInbox from '@/pages/AdminInbox';
import DocumentManagement from '@/pages/DocumentManagement';
import PerformanceAnalytics from '@/pages/PerformanceAnalytics';
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
              <Dashboard />
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
      </Route>
    </Routes>
  );
}

export default AppRoutes;