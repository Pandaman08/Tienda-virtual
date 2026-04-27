import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CartDrawer } from "../components/cart-drawer";
import { NavBar } from "../components/nav-bar";
import { Footer } from "../components/footer";
import { ProtectedRoute } from "../components/protected-route";
import { AdminPage } from "../pages/admin.page";
import { CarritoPage } from "../pages/carrito.page";
import { LoginPage } from "../pages/login.page";
import { TiendaPage } from "../pages/tienda.page";

export const AppRouter = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsCartOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar onCartClick={() => setIsCartOpen(true)} />
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<TiendaPage />} />
          <Route
            path="/carrito"
            element={
              <ProtectedRoute roles={["CLIENTE"]}>
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
      </main>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <Footer />
    </div>
  );
};
