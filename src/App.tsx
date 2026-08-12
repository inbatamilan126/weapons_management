import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { InventoryList } from './pages/inventory/InventoryList';
import { WeaponForm } from './pages/inventory/WeaponForm';
import { WeaponDetail } from './pages/inventory/WeaponDetail';
import { IssueWeapon } from './pages/issues/IssueWeapon';
import { IssuesList } from './pages/issues/IssuesList';
import { ReturnWeapon } from './pages/issues/ReturnWeapon';
import { StudentsList } from './pages/students/StudentsList';
import { UsersList } from './pages/users/UsersList';
import { CreateUser } from './pages/users/CreateUser';
import { UserPermissions } from './pages/users/UserPermissions';
import { NotificationsList } from './pages/notifications/NotificationsList';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />

              {/* Inventory */}
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute module="inventory_management" level="view">
                    <InventoryList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/new"
                element={
                  <ProtectedRoute module="inventory_management" level="manage">
                    <WeaponForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/:id/edit"
                element={
                  <ProtectedRoute module="inventory_management" level="manage">
                    <WeaponForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/:id"
                element={
                  <ProtectedRoute module="inventory_management" level="view">
                    <WeaponDetail />
                  </ProtectedRoute>
                }
              />

              {/* Issues & Checkout */}
              <Route
                path="/issue"
                element={
                  <ProtectedRoute module="issue_management" level="manage">
                    <IssueWeapon />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/issues"
                element={
                  <ProtectedRoute module="issue_management" level="view">
                    <IssuesList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/issues/:id/return"
                element={
                  <ProtectedRoute module="issue_management" level="manage">
                    <ReturnWeapon />
                  </ProtectedRoute>
                }
              />

              {/* Students */}
              <Route
                path="/students"
                element={
                  <ProtectedRoute module="issue_management" level="view">
                    <StudentsList />
                  </ProtectedRoute>
                }
              />

              {/* Staff Users */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute module="user_management" level="view">
                    <UsersList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/new"
                element={
                  <ProtectedRoute module="user_management" level="manage">
                    <CreateUser />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/:id/permissions"
                element={
                  <ProtectedRoute module="user_management" level="manage">
                    <UserPermissions />
                  </ProtectedRoute>
                }
              />

              {/* Notifications */}
              <Route path="/notifications" element={<NotificationsList />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
