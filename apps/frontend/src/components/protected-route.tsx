import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

type ProtectedRouteProps = {
  children: JSX.Element;
  roles?: Array<"ADMIN" | "CLIENTE">;
};

export const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { accessToken, rol } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (roles && rol && !roles.includes(rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
};
