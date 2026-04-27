import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

export const NavBar = () => {
  const { rol, logout } = useAuthStore();

  return (
    <nav>
      <div className="container" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <Link to="/">Tienda Virtual</Link>
        <Link to="/carrito">Carrito</Link>
        {rol === "ADMIN" && <Link to="/admin">Admin</Link>}
        <button className="btn" style={{ marginLeft: "auto" }} onClick={logout}>
          Salir
        </button>
      </div>
    </nav>
  );
};
