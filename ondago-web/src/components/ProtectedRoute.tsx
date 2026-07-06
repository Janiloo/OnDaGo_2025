import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AdminKind } from "../store/AuthContext";

/** Gates a route to a specific admin kind; redirects to login or the correct area. */
export default function ProtectedRoute({
  allow,
  children,
}: {
  allow: AdminKind;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.kind !== allow) {
    return <Navigate to={user.kind === "super" ? "/platform" : "/company"} replace />;
  }
  return <>{children}</>;
}
