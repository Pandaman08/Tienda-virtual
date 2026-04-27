import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";
import { apiClient } from "../services/api-client";

type Kpi = {
  totalOrdenes: number;
  ventasTotales: number;
  ticketPromedio: number;
};

type Producto = {
  id: number;
  sku: string;
  nombre: string;
  descripcion?: string | null;
  categoria: string;
  precio: number;
  stock_minimo: number;
  activo: boolean;
};

type UsuarioAdmin = {
  id: number;
  email: string;
  activo: boolean;
  created_at: string;
  rol: { nombre: "ADMIN" | "CLIENTE" };
  cliente?: {
    id: number;
    nombre: string;
    apellido: string;
    telefono?: string | null;
  } | null;
};

type InventarioItem = {
  id: number;
  stock_actual: number;
  stock_reservado: number;
  stock_disponible: number;
  producto: {
    id: number;
    nombre: string;
    categoria: string;
    stock_minimo: number;
  };
};

type OrdenAdmin = {
  id: number;
  cliente_id: number;
  numero_orden: string;
  total: number;
  created_at: string;
};

type ProductFormState = {
  sku: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: string;
  stockMinimo: string;
};

const emptyForm: ProductFormState = {
  sku: "",
  nombre: "",
  descripcion: "",
  categoria: "",
  precio: "",
  stockMinimo: "5"
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(value);

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const DonutWidget = ({
  percent,
  title,
  subtitle,
  color
}: {
  percent: number;
  title: string;
  subtitle: string;
  color: string;
}) => {
  const data = [
    { name: "value", value: percent },
    { name: "rest", value: Math.max(0, 100 - percent) }
  ];

  return (
    <div className="h-full bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col items-center justify-center gap-1 overflow-hidden">
      <div className="w-32 h-32 sm:w-36 sm:h-36 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={52} outerRadius={68} startAngle={90} endAngle={-270} stroke="none">
              <Cell fill={color} />
              <Cell fill="#e6e8f2" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-extrabold text-slate-800">{percent}%</span>
        </div>
      </div>
      <p className="text-lg sm:text-xl font-bold text-slate-800 text-center">{title}</p>
      <p className="text-slate-400 text-sm sm:text-base text-center">{subtitle}</p>
    </div>
  );
};

export const AdminPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"metricas" | "productos" | "usuarios">("metricas");
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kpis"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Kpi }>("/reportes/kpis");
      return response.data.data;
    }
  });

  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: { items: Producto[] } }>("/catalogo?page=1&limit=100");
      return response.data.data.items;
    }
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: UsuarioAdmin[] }>("/usuarios");
      return response.data.data;
    }
  });

  const { data: inventoryData } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: InventarioItem[] }>("/inventario");
      return response.data.data;
    }
  });

  const { data: ordersData } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: OrdenAdmin[] }>("/ordenes");
      return response.data.data;
    }
  });

  const createProduct = useMutation({
    mutationFn: async (payload: ProductFormState) => {
      await apiClient.post("/catalogo", {
        sku: payload.sku,
        nombre: payload.nombre,
        descripcion: payload.descripcion || undefined,
        categoria: payload.categoria,
        precio: Number(payload.precio),
        stockMinimo: Number(payload.stockMinimo || 0)
      });
    },
    onSuccess: () => {
      toast.success("Producto creado");
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    }
  });

  const updateProduct = useMutation({
    mutationFn: async (payload: ProductFormState & { id: number }) => {
      await apiClient.patch(`/catalogo/${payload.id}`, {
        nombre: payload.nombre,
        descripcion: payload.descripcion || undefined,
        categoria: payload.categoria,
        precio: Number(payload.precio)
      });
    },
    onSuccess: () => {
      toast.success("Producto actualizado");
      setEditingId(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    }
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/catalogo/${id}`);
    },
    onSuccess: () => {
      toast.success("Producto eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    }
  });

  const products = useMemo(() => productsData ?? [], [productsData]);
  const users = useMemo(() => usersData ?? [], [usersData]);
  const inventory = useMemo(() => inventoryData ?? [], [inventoryData]);
  const orders = useMemo(() => ordersData ?? [], [ordersData]);

  const stockBajo = useMemo(
    () =>
      inventory
        .filter((item) => Number(item.stock_disponible) <= Number(item.producto.stock_minimo))
        .sort((a, b) => Number(a.stock_disponible) - Number(b.stock_disponible)),
    [inventory]
  );

  const ventasHoy = useMemo(() => {
    const now = new Date();
    return orders
      .filter((order) => {
        const created = new Date(order.created_at);
        return (
          created.getDate() === now.getDate() &&
          created.getMonth() === now.getMonth() &&
          created.getFullYear() === now.getFullYear()
        );
      })
      .reduce((acc, order) => acc + Number(order.total), 0);
  }, [orders]);

  const clientesCount = useMemo(() => users.filter((u) => u.rol.nombre === "CLIENTE").length, [users]);

  const stockUsoPercent = useMemo(() => {
    const totalActual = inventory.reduce((acc, item) => acc + Number(item.stock_actual), 0);
    const totalReservado = inventory.reduce((acc, item) => acc + Number(item.stock_reservado), 0);
    if (!totalActual) return 0;
    return Math.max(1, Math.min(100, Math.round((totalReservado / totalActual) * 100)));
  }, [inventory]);

  const estadoCajaPercent = useMemo(() => {
    const ventas = Number(data?.ventasTotales || 0);
    const target = Math.max(1, ventas + 8000);
    return Math.max(1, Math.min(100, Math.round((ventas / target) * 100)));
  }, [data?.ventasTotales]);

  const categoryBars = useMemo(() => {
    const grouped = products.reduce<Record<string, number>>((acc, item) => {
      acc[item.categoria] = (acc[item.categoria] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([categoria, qty]) => ({
        categoria,
        short: categoria.length > 7 ? `${categoria.slice(0, 7)}.` : categoria,
        a: Math.max(6, qty * 12),
        b: Math.max(4, Math.round(qty * 10))
      }))
      .sort((x, y) => y.a - x.a)
      .slice(0, 5);
  }, [products]);

  const trendData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - index));
      return d;
    });

    return days.map((date) => {
      const key = date.toISOString().slice(0, 10);
      const total = orders
        .filter((order) => order.created_at.slice(0, 10) === key)
        .reduce((sum, order) => sum + Number(order.total), 0);
      return {
        day: date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" }),
        total: Number(total.toFixed(2))
      };
    });
  }, [orders]);

  const ultimasVentas = useMemo(() => {
    const clientById = new Map<number, string>();
    users.forEach((user) => {
      if (user.cliente) {
        clientById.set(user.cliente.id, `${user.cliente.nombre} ${user.cliente.apellido}`);
      }
    });

    return orders.slice(0, 5).map((order) => ({
      id: order.id,
      nombre: clientById.get(order.cliente_id) ?? `Cliente #${order.cliente_id}`,
      fecha: formatDateTime(order.created_at),
      total: Number(order.total)
    }));
  }, [orders, users]);

  const downloadReport = async (kind: "operacional" | "gestion") => {
    try {
      const response = await apiClient.get(`/reportes/${kind}`, {
        responseType: "blob"
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${kind}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo generar el reporte PDF");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Administrador</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de rendimiento de la tienda</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 inline-flex flex-wrap gap-2">
          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === "metricas" ? "bg-brand-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            onClick={() => setActiveTab("metricas")}
          >
            Metricas
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === "productos" ? "bg-brand-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            onClick={() => setActiveTab("productos")}
          >
            CRUD Productos
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === "usuarios" ? "bg-brand-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            onClick={() => setActiveTab("usuarios")}
          >
            Usuarios
          </button>
        </div>

        {activeTab === "metricas" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 mb-5">
              <div className="md:col-span-2 xl:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 overflow-hidden">
                <h2 className="text-xl font-bold text-slate-800">Ventas por Categoria</h2>
                <div className="mt-4 h-[152px] flex items-end gap-2 sm:gap-4 overflow-hidden">
                  {categoryBars.map((item) => (
                    <div key={item.categoria} className="flex-1 min-w-[44px]">
                      <div className="h-[128px] flex items-end justify-center gap-2">
                        <div className="w-4 md:w-5 rounded-t-xl bg-teal-500" style={{ height: `${item.a}px` }} />
                        <div className="w-4 md:w-5 rounded-t-xl bg-violet-400" style={{ height: `${item.b}px` }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-2 text-center truncate">{item.short}</p>
                    </div>
                  ))}
                  {!categoryBars.length && <p className="text-sm text-slate-500">Sin datos de categorias para mostrar.</p>}
                </div>
              </div>

              <div className="xl:col-span-2">
                <DonutWidget percent={estadoCajaPercent} title="Estado Caja" subtitle="Operativa" color="#F59E0B" />
              </div>

              <div className="xl:col-span-2">
                <DonutWidget percent={stockUsoPercent} title="Stock Uso" subtitle="Del inventario" color="#A855F7" />
              </div>

              <div className="md:col-span-2 xl:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 overflow-hidden">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Estadisticas</h2>
                <div className="space-y-2.5">
                  <div className="rounded-2xl border-l-4 border-fuchsia-500 bg-fuchsia-50 px-3 py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-sm leading-tight">Ventas hoy</span>
                    <span className="text-fuchsia-600 font-extrabold text-lg xl:text-xl text-right leading-tight break-all sm:break-normal">{isLoading ? "..." : formatCurrency(ventasHoy)}</span>
                  </div>
                  <div className="rounded-2xl border-l-4 border-teal-500 bg-teal-50 px-3 py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-sm">Productos</span>
                    <span className="text-teal-600 font-extrabold text-lg xl:text-xl leading-none">{products.length}</span>
                  </div>
                  <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 px-3 py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-sm">Clientes</span>
                    <span className="text-amber-600 font-extrabold text-lg xl:text-xl leading-none">{clientesCount}</span>
                  </div>
                  <div className="rounded-2xl border-l-4 border-pink-500 bg-pink-50 px-3 py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-sm">Stock bajo</span>
                    <span className="text-pink-600 font-extrabold text-lg xl:text-xl leading-none">{stockBajo.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
              <div className="xl:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 overflow-hidden">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Tendencia de Ventas</h2>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                      <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: "#22c55e" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="xl:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 overflow-hidden">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Stock Critico</h2>
                <div className="space-y-4">
                  {stockBajo.slice(0, 5).map((item, index) => {
                    const ratio = Math.max(4, Math.min(100, Math.round((Number(item.stock_disponible) / Math.max(1, Number(item.producto.stock_minimo))) * 100)));
                    const barColor = index % 3 === 0 ? "bg-violet-500" : index % 3 === 1 ? "bg-pink-500" : "bg-green-600";
                    return (
                      <div key={item.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-semibold text-slate-600 truncate pr-3">{item.producto.nombre}</span>
                          <span className="font-bold text-slate-700">{Number(item.stock_disponible)} u.</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${ratio}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {!stockBajo.length && <p className="text-sm text-slate-500">No hay productos con stock critico.</p>}
                </div>
              </div>

              <div className="xl:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 overflow-hidden">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Ultimas Ventas</h2>
                <div className="space-y-3">
                  {ultimasVentas.map((sale, index) => {
                    const bullet = ["bg-violet-400", "bg-pink-500", "bg-teal-500", "bg-amber-500", "bg-blue-500"][index % 5];
                    return (
                      <div key={sale.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-8 h-8 rounded-full ${bullet} inline-block flex-shrink-0`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 truncate">{sale.nombre}</p>
                            <p className="text-xs text-slate-400 truncate">{sale.fecha}</p>
                          </div>
                        </div>
                        <p className="font-extrabold text-slate-800 text-sm sm:text-base md:text-lg whitespace-nowrap ml-3">{formatCurrency(sale.total)}</p>
                      </div>
                    );
                  })}
                  {!ultimasVentas.length && <p className="text-sm text-slate-500">Sin ventas recientes.</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Ventas S/</h3>
                <p className="text-2xl font-extrabold text-teal-600 break-words">{isLoading ? "..." : formatCurrency(Number(data?.ventasTotales || 0))}</p>
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Compras S/</h3>
                <p className="text-2xl font-extrabold text-indigo-600 break-words">{formatCurrency(Number(data?.ventasTotales || 0) * 0.62)}</p>
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-3">Distribucion</h3>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Ventas</span>
                  <span className="font-bold text-slate-800">39%</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: "39%" }} />
                </div>
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-3">Progreso</h3>
                <p className="text-slate-600 mb-2">Caja: {estadoCajaPercent}%</p>
                <div className="flex gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <span key={index} className={`w-5 h-5 rounded-full ${index < Math.round(estadoCajaPercent / 18) ? "bg-teal-400" : "bg-slate-200"}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Descargar Reportes</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void downloadReport("operacional")}
                  className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Reporte Operacional PDF
                </button>
                <button
                  type="button"
                  onClick={() => void downloadReport("gestion")}
                  className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-5 py-2.5 rounded-xl border border-gray-300 transition-colors text-sm"
                >
                  Reporte Gestion PDF
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === "productos" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4">{editingId ? "Editar producto" : "Nuevo producto"}</h2>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingId) {
                    updateProduct.mutate({ ...form, id: editingId });
                    return;
                  }
                  createProduct.mutate(form);
                }}
              >
                <input className="input-field" placeholder="SKU" value={form.sku} disabled={Boolean(editingId)} onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))} />
                <input className="input-field" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))} />
                <input className="input-field" placeholder="Categoria" value={form.categoria} onChange={(e) => setForm((s) => ({ ...s, categoria: e.target.value }))} />
                <input className="input-field" placeholder="Precio" type="number" value={form.precio} onChange={(e) => setForm((s) => ({ ...s, precio: e.target.value }))} />
                <input className="input-field" placeholder="Stock minimo" type="number" value={form.stockMinimo} disabled={Boolean(editingId)} onChange={(e) => setForm((s) => ({ ...s, stockMinimo: e.target.value }))} />
                <textarea className="input-field" placeholder="Descripcion" value={form.descripcion} onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))} />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">{editingId ? "Guardar cambios" : "Crear producto"}</button>
                  {editingId && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditingId(null);
                        setForm(emptyForm);
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-x-auto">
              <h2 className="font-bold text-gray-800 mb-4">Productos ({products.length})</h2>
              {isProductsLoading ? (
                <p className="text-sm text-gray-500">Cargando productos...</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2">SKU</th>
                      <th className="py-2">Nombre</th>
                      <th className="py-2">Categoria</th>
                      <th className="py-2">Precio</th>
                      <th className="py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="py-2">{p.sku}</td>
                        <td className="py-2">{p.nombre}</td>
                        <td className="py-2">{p.categoria}</td>
                        <td className="py-2">S/ {Number(p.precio).toFixed(2)}</td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => {
                                setEditingId(p.id);
                                setForm({
                                  sku: p.sku,
                                  nombre: p.nombre,
                                  descripcion: p.descripcion || "",
                                  categoria: p.categoria,
                                  precio: String(p.precio),
                                  stockMinimo: String(p.stock_minimo)
                                });
                              }}
                            >
                              Editar
                            </button>
                            <button type="button" className="btn-danger" onClick={() => deleteProduct.mutate(p.id)}>
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "usuarios" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-x-auto">
            <h2 className="font-bold text-gray-800 mb-4">Usuarios ({users.length})</h2>
            {isUsersLoading ? (
              <p className="text-sm text-gray-500">Cargando usuarios...</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2">Email</th>
                    <th className="py-2">Rol</th>
                    <th className="py-2">Nombre</th>
                    <th className="py-2">Telefono</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100">
                      <td className="py-2">{u.email}</td>
                      <td className="py-2">{u.rol.nombre}</td>
                      <td className="py-2">{u.cliente ? `${u.cliente.nombre} ${u.cliente.apellido}` : "-"}</td>
                      <td className="py-2">{u.cliente?.telefono || "-"}</td>
                      <td className="py-2">{u.activo ? "Activo" : "Inactivo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

