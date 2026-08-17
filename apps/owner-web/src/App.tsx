import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequirePermission } from './auth/RequireAuth.js';
import { AppLayout } from './components/AppLayout.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.js';
import { ResetPasswordPage } from './pages/ResetPasswordPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { TurfsPage } from './pages/TurfsPage.js';
import { TurfFormPage } from './pages/TurfFormPage.js';
import { TurfDetailPage } from './pages/TurfDetailPage.js';
import { TurfImagesPage } from './pages/TurfImagesPage.js';
import { TurfFeaturesPage } from './pages/TurfFeaturesPage.js';
import { TurfCourtsPage } from './pages/TurfCourtsPage.js';
import { OperatingHoursPage } from './pages/OperatingHoursPage.js';
import { AvailabilityPage } from './pages/AvailabilityPage.js';
import { TurfPricingPage } from './pages/TurfPricingPage.js';
import { BookingsPage } from './pages/BookingsPage.js';
import { BookingDetailPage } from './pages/BookingDetailPage.js';
import { BookingCreatePage } from './pages/BookingCreatePage.js';
import { NotificationsPage } from './pages/NotificationsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
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
          path="/profile"
          element={
            <RequirePermission permission="profile.read">
              <ProfilePage />
            </RequirePermission>
          }
        />
        <Route
          path="/turfs"
          element={
            <RequirePermission permission="turfs.read">
              <TurfsPage />
            </RequirePermission>
          }
        />
        <Route
          path="/turfs/new"
          element={
            <RequirePermission permission="turfs.create">
              <TurfFormPage />
            </RequirePermission>
          }
        />
        <Route
          path="/turfs/:id"
          element={
            <RequirePermission permission="turfs.read">
              <TurfDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="/turfs/:id/edit"
          element={
            <RequirePermission permission="turfs.update">
              <TurfFormPage />
            </RequirePermission>
          }
        />
        <Route
          path="/turfs/:id/images"
          element={
            <RequirePermission permission="turfs.update">
              <TurfImagesPage />
            </RequirePermission>
          }
        />
        <Route
          path="/turfs/:id/features"
          element={
            <RequirePermission permission="turfs.update">
              <TurfFeaturesPage />
            </RequirePermission>
          }
        />
        <Route
          path="/turfs/:id/courts"
          element={
            <RequirePermission permission="turfs.update">
              <TurfCourtsPage />
            </RequirePermission>
          }
        />
        <Route
          path="/turfs/:id/hours"
          element={
            <RequirePermission permission="turfs.update">
              <OperatingHoursPage />
            </RequirePermission>
          }
        />
        <Route
          path="/turfs/:id/availability"
          element={
            <RequirePermission permission="turfs.update">
              <AvailabilityPage />
            </RequirePermission>
          }
        />
        <Route
          path="/turfs/:id/pricing"
          element={
            <RequirePermission permission="turfs.update">
              <TurfPricingPage />
            </RequirePermission>
          }
        />
        <Route
          path="/bookings"
          element={
            <RequirePermission permission="bookings.read">
              <BookingsPage />
            </RequirePermission>
          }
        />
        <Route
          path="/bookings/new"
          element={
            <RequirePermission permission="bookings.manage">
              <BookingCreatePage />
            </RequirePermission>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <RequirePermission permission="bookings.read">
              <BookingDetailPage />
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
          path="/reports"
          element={
            <RequirePermission permission="reports.read">
              <ReportsPage />
            </RequirePermission>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
