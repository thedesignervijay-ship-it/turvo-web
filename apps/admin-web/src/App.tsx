import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequirePermission } from './auth/RequireAuth.js';
import { AppLayout } from './components/AppLayout.js';
import { LoginPage } from './pages/LoginPage.js';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.js';
import { ResetPasswordPage } from './pages/ResetPasswordPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { OwnersListPage } from './pages/OwnersListPage.js';
import { TurfsListPage } from './pages/TurfsListPage.js';
import { MasterDataPage } from './pages/MasterDataPage.js';
import { BookingsListPage } from './pages/BookingsListPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { NotificationsPage } from './pages/NotificationsPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route
          path="/"
          element={
            <RequirePermission permission="dashboard.view">
              <DashboardPage />
            </RequirePermission>
          }
        />
        <Route
          path="/owners"
          element={
            <RequirePermission permission="owners.read">
              <OwnersListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/turfs"
          element={
            <RequirePermission permission="turfs.read">
              <TurfsListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/bookings"
          element={
            <RequirePermission permission="bookings.read">
              <BookingsListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/master-data"
          element={
            <RequirePermission permission="master-data.read">
              <MasterDataPage />
            </RequirePermission>
          }
        />
        <Route
          path="/reports"
          element={
            <RequirePermission permission="reports.read">
              <ReportsPage />
            </RequirePermission>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequirePermission permission="notifications.read">
              <NotificationsPage />
            </RequirePermission>
          }
        />
        <Route
          path="/settings"
          element={
            <RequirePermission permission="settings.manage">
              <SettingsPage />
            </RequirePermission>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
