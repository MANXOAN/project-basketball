import { Navigate, useLocation } from "react-router-dom";
import { AuthUser, getUser, isLoggedIn } from "../lib/auth";

type Props = {
  children: React.ReactNode;
  allowedRoles?: NonNullable<AuthUser["role"]>[];
};

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const location = useLocation();

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(getUser()?.role || "user")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
