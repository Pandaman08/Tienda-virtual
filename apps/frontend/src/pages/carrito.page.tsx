import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiClient } from "../services/api-client";
import { useCartStore } from "../stores/cart.store";

export const CarritoPage = () => {
  const navigate = useNavigate();
  const { items, remove, clear } = useCartStore();

  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.precio * item.cantidad, 0),
    [items]
  );

  const checkout = async () => {
    for (const item of items) {
      await apiClient.post("/carrito/items", { productoId: item.id, cantidad: item.cantidad });
    }

    await apiClient.post("/ordenes/checkout", { metodoPago: "TARJETA" });
    clear();
    toast.success("Compra realizada");
    navigate("/");
  };

  return (
    <div className="container">
      <h1>Carrito</h1>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {items.map((item) => (
          <article key={item.id} className="card" style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <h3>{item.nombre}</h3>
              <p>
                {item.cantidad} x S/ {item.precio.toFixed(2)}
              </p>
            </div>
            <button className="btn" onClick={() => remove(item.id)}>
              Quitar
            </button>
          </article>
        ))}
      </div>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Total: S/ {total.toFixed(2)}</h2>
        <button className="btn btn-primary" onClick={checkout}>
          Confirmar compra
        </button>
      </div>
    </div>
  );
};
