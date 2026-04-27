import { Navigate, Route, Routes } from "react-router-dom";
import { NavBar } from "../components/nav-bar";
import { ProtectedRoute } from "../components/protected-route";
import { AdminPage } from "../pages/admin.page";
import { CarritoPage } from "../pages/carrito.page";
import { LoginPage } from "../pages/login.page";
import { TiendaPage } from "../pages/tienda.page";

export const AppRouter = () => {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<TiendaPage />} />
        <Route
          path="/carrito"
          element={
            <ProtectedRoute roles={["CLIENTE", "ADMIN"]}>
              <CarritoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};
