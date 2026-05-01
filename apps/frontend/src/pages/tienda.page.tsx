import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ShoppingCart, ZoomIn, X } from "lucide-react";
import { apiClient } from "../services/api-client";
import { useCartStore } from "../stores/cart.store";

type Producto = {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  descripcion?: string;
  imagen_url?: string | null;
  inventario?: {
    stock_disponible: number;
  } | null;
};

const formatMoney = (value: number) => `S/ ${value.toFixed(2)}`;

export const TiendaPage = () => {
  const { items, add, hydrate } = useCartStore();
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState("TODAS");

  // Keep local filter in sync with URL param
  useEffect(() => {
    setSearchTerm(searchParams.get("q") ?? "");
  }, [searchParams]);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; nombre: string } | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const { data, isLoading } = useQuery({
    queryKey: ["catalogo-pos"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: { items: Producto[] } }>("/catalogo?page=1&limit=100");
      return response.data.data.items;
    }
  });

  const categorias = useMemo(() => {
    const values = new Set((data || []).map((p) => p.categoria));
    return ["TODAS", ...Array.from(values)];
  }, [data]);

  const productosFiltrados = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return (data || []).filter((p) => {
      const bySearch =
        !normalizedSearch ||
        p.nombre.toLowerCase().includes(normalizedSearch) ||
        (p.descripcion || "").toLowerCase().includes(normalizedSearch);

      const byCategory = category === "TODAS" || p.categoria === category;
      return bySearch && byCategory;
    });
  }, [category, data, searchTerm]);

  const addToCart = (p: Producto) => {
    const stock = Number(p.inventario?.stock_disponible ?? 0);
    if (stock <= 0) {
      toast.error("Producto sin stock disponible");
      return;
    }

    const inCart = items.find((item) => item.id === p.id)?.cantidad ?? 0;
    if (inCart >= stock) {
      toast.error("No puedes agregar mas unidades que el stock disponible");
      return;
    }

    add({ id: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad: 1 });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Catálogo de productos</h1>
            <p className="text-sm text-slate-500">Explora nuestros productos y realiza tu pedido en minutos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <section className="xl:col-span-12 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o descripcion"
                className="md:col-span-2 input-field"
              />
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categorias.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[68vh] overflow-y-auto pr-1">
              {isLoading && (
                <p className="text-sm text-slate-500">Cargando productos...</p>
              )}
              {!isLoading && productosFiltrados.map((p) => {
                const stock = Number(p.inventario?.stock_disponible ?? 0);
                const agotado = stock <= 0;
                let stockBadgeClass = "bg-emerald-100 text-emerald-700";
                if (stock === 0) stockBadgeClass = "bg-red-100 text-red-600";
                else if (stock <= 5) stockBadgeClass = "bg-amber-100 text-amber-700";
                let stockLabel = `Stock: ${stock}`;
                if (stock === 0) stockLabel = "Sin stock";
                else if (stock <= 5) stockLabel = `Últimas ${stock}`;
                return (
                  <article
                    key={p.id}
                    className="group rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:border-brand-200 transition-all duration-200 cursor-default"
                  >
                    {/* Imagen */}
                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                      {p.imagen_url ? (
                        <img
                          src={p.imagen_url}
                          alt={p.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                          <ShoppingCart className="w-12 h-12 text-slate-300" />
                          <span className="text-xs text-slate-400">Sin imagen</span>
                        </div>
                      )}
                      {/* Botón lupa — solo si hay imagen */}
                      {p.imagen_url && (
                        <button
                          type="button"
                          onClick={() => setZoomedImage({ url: p.imagen_url!, nombre: p.nombre })}
                          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors duration-200"
                          aria-label="Ver imagen"
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md">
                            <ZoomIn className="w-5 h-5 text-slate-700" />
                          </span>
                        </button>
                      )}
                      {/* Badge categoría */}
                      <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
                        {p.categoria}
                      </span>
                      {/* Badge stock */}
                      <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${stockBadgeClass}`}>
                        {stockLabel}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-slate-800 leading-snug line-clamp-2 min-h-[44px] text-sm">{p.nombre}</h3>

                      <div className="flex items-center justify-between mt-3">
                        <p className="text-2xl font-extrabold text-brand-700 tracking-tight">{formatMoney(Number(p.precio))}</p>
                        <button
                          type="button"
                          disabled={agotado}
                          onClick={() => addToCart(p)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-brand-700 text-white hover:bg-brand-800 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          {agotado ? "Agotado" : "Agregar"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Lightbox */}
      {zoomedImage && (
        <dialog
          open
          aria-label={zoomedImage.nombre}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 w-full h-full max-w-none max-h-none m-0 p-0 border-0"
        >
          {/* backdrop click */}
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Cerrar visor"
            onClick={() => setZoomedImage(null)}
          />
          <div className="relative max-w-3xl w-full mx-4 animate-in zoom-in-95 duration-200 z-10">
            <img
              src={zoomedImage.url}
              alt={zoomedImage.nombre}
              className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 shadow-lg hover:bg-slate-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
            <p className="mt-3 text-center text-white text-sm font-semibold drop-shadow">{zoomedImage.nombre}</p>
          </div>
        </dialog>
      )}
    </div>
  );
};
