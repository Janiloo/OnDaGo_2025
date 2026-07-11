import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./store/AuthContext";
import LoginPage from "./pages/LoginPage";
import PlatformDashboard from "./pages/PlatformDashboard";
import PlatformCompaniesPage from "./pages/PlatformCompaniesPage";
import CompanyDashboard from "./pages/CompanyDashboard";
import CompanyTerminalsPage from "./pages/CompanyTerminalsPage";
import CompanyRoutesPage from "./pages/CompanyRoutesPage";
import CompanyVehiclesPage from "./pages/CompanyVehiclesPage";
import CompanyDriversPage from "./pages/CompanyDriversPage";
import CompanyBrandingPage from "./pages/CompanyBrandingPage";
import CompanyReportsPage from "./pages/CompanyReportsPage";
import CompanyFleetPage from "./pages/CompanyFleetPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { colors } from "./theme";

export default function App() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <div style={{ minHeight: "100vh", background: colors.bg }} />;
  }

  const home = user ? (user.kind === "super" ? "/platform" : "/company") : "/login";

  // Hard gate: an account on a temporary password can go nowhere until it sets
  // a permanent one.
  if (user && user.mustChangePassword) {
    return (
      <Routes>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<Navigate to="/change-password" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <LoginPage />} />
      <Route
        path="/change-password"
        element={user ? <ChangePasswordPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/platform"
        element={
          <ProtectedRoute allow="super">
            <PlatformDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/companies"
        element={
          <ProtectedRoute allow="super">
            <PlatformCompaniesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company"
        element={
          <ProtectedRoute allow="company">
            <CompanyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/terminals"
        element={
          <ProtectedRoute allow="company">
            <CompanyTerminalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/routes"
        element={
          <ProtectedRoute allow="company">
            <CompanyRoutesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/vehicles"
        element={
          <ProtectedRoute allow="company">
            <CompanyVehiclesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/drivers"
        element={
          <ProtectedRoute allow="company">
            <CompanyDriversPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/branding"
        element={
          <ProtectedRoute allow="company">
            <CompanyBrandingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/reports"
        element={
          <ProtectedRoute allow="company">
            <CompanyReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/fleet"
        element={
          <ProtectedRoute allow="company">
            <CompanyFleetPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
