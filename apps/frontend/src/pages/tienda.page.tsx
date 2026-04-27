import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../services/api-client";
import { useCartStore } from "../stores/cart.store";

type Producto = {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  descripcion?: string;
};

export const TiendaPage = () => {
  const { add, hydrate } = useCartStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const { data } = useQuery({
    queryKey: ["catalogo"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: { items: Producto[] } }>("/catalogo?page=1&limit=24");
      return response.data.data.items;
    }
  });

  return (
    <div className="container">
      <h1>Catalogo de Productos</h1>
      <div className="grid">
        {(data || []).map((p) => (
          <article key={p.id} className="card">
            <h3>{p.nombre}</h3>
            <p>{p.categoria}</p>
            <p>{p.descripcion}</p>
            <strong>S/ {Number(p.precio).toFixed(2)}</strong>
            <div style={{ marginTop: "0.75rem" }}>
              <button className="btn btn-primary" onClick={() => add({ id: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad: 1 })}>
                Agregar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
