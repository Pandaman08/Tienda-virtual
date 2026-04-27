import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../services/api-client";
import { useCartStore } from "../stores/cart.store";
import { ProductCard } from "../components/product-card";
import { SkeletonCard } from "../components/skeleton-card";

type Producto = {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  descripcion?: string;
};

export const TiendaPage = () => {
  const { add, hydrate } = useCartStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("TODAS");
  const [priceRange, setPriceRange] = useState("TODOS");
  const [sortBy, setSortBy] = useState("DESTACADOS");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const { data, isLoading } = useQuery({
    queryKey: ["catalogo"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: { items: Producto[] } }>("/catalogo?page=1&limit=24");
      return response.data.data.items;
    }
  });

  const handleAdd = (p: Producto) => {
    add({ id: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad: 1 });
  };

  const categorias = useMemo(() => {
    const values = new Set((data || []).map((p) => p.categoria));
    return ["TODAS", ...Array.from(values)];
  }, [data]);

  const productosFiltrados = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = (data || []).filter((p) => {
      const bySearch =
        !normalizedSearch ||
        p.nombre.toLowerCase().includes(normalizedSearch) ||
        (p.descripcion || "").toLowerCase().includes(normalizedSearch);

      const byCategory = category === "TODAS" || p.categoria === category;

      const byPrice =
        priceRange === "TODOS" ||
        (priceRange === "MENOS_200" && Number(p.precio) < 200) ||
        (priceRange === "200_1000" && Number(p.precio) >= 200 && Number(p.precio) <= 1000) ||
        (priceRange === "MAS_1000" && Number(p.precio) > 1000);

      return bySearch && byCategory && byPrice;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "PRECIO_ASC") {
        return Number(a.precio) - Number(b.precio);
      }
      if (sortBy === "PRECIO_DESC") {
        return Number(b.precio) - Number(a.precio);
      }
      return a.nombre.localeCompare(b.nombre);
    });
  }, [category, data, priceRange, searchTerm, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-2xl">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
              ✨ Nuevos productos disponibles
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
              Todo lo que necesitas,<br />en un solo lugar
            </h1>
            <p className="text-brand-100 text-base mb-6">
              Descubre nuestra colección de productos con los mejores precios y calidad garantizada.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>+4.8 calificación</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Envío rápido</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Compra segura</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header sección */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Catálogo de Productos</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isLoading ? "Cargando..." : `${productosFiltrados.length} productos encontrados`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Todos los productos
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
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
          <select className="input-field" value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
            <option value="TODOS">Todos los precios</option>
            <option value="MENOS_200">Menos de S/ 200</option>
            <option value="200_1000">S/ 200 a S/ 1000</option>
            <option value="MAS_1000">Mas de S/ 1000</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <p className="text-xs text-gray-500">
            Filtros aplicados: {category} | {priceRange.replace("_", " ")}
          </p>
          <div className="flex items-center gap-2">
            <select className="input-field !w-auto" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="DESTACADOS">Ordenar por nombre</option>
              <option value="PRECIO_ASC">Precio: menor a mayor</option>
              <option value="PRECIO_DESC">Precio: mayor a menor</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCategory("TODAS");
                setPriceRange("TODOS");
                setSortBy("DESTACADOS");
              }}
              className="btn-secondary"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Grid de productos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : productosFiltrados.map((p) => (
                <ProductCard key={p.id} producto={p} onAddToCart={handleAdd} />
              ))}
        </div>

        {!isLoading && productosFiltrados.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-lg font-semibold text-gray-700">No hay resultados con esos filtros</h3>
            <p className="text-gray-500 text-sm mt-2">Prueba cambiando categoria o rango de precio.</p>
          </div>
        )}
      </div>
    </div>
  );
};

