import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CartesianGrid, Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";
import { AlertTriangle, Ban, BarChart2, BookOpen, Briefcase, CheckCircle2, ClipboardList, Cog, Cpu, Download, Dumbbell, Eye, FileSpreadsheet, FileText, FilterX, Gamepad2, Headphones, Home, KeyRound, Laptop, LogOut, Menu, Monitor, Package, Pencil, PlusCircle, Printer, RefreshCw, RotateCcw, Save, Settings, Shirt, ShoppingBag, Smartphone, Sofa, Tablet, Trash2, TrendingUp, X, Users, Wrench, type LucideIcon } from "lucide-react";
import { apiClient } from "../services/api-client";
import { ProductModal } from "../components/product-modal";
import { ClientCredentialsModal } from "../components/client-credentials-modal";
import { useAuthStore } from "../stores/auth.store";
import { useNavigate } from "react-router-dom";

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
  imagen_url?: string | null;
  categoria: string;
  precio: number;
  stock_minimo: number;
  activo: boolean;
  inventario?: {
    stock_disponible: number;
  } | null;
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
  subtotal: number;
  impuestos: number;
  estado: string;
  metodo_pago: string;
  transaccion_id?: string | null;
  created_at: string;
  updated_at?: string;
  cliente?: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
};

type OrdenDetalleItemAdmin = {
  id: number;
  cantidad: number;
  precio_unitario: number;
  total_linea: number;
  producto: {
    id: number;
    nombre: string;
  };
};

type OrdenDetalleAdmin = OrdenAdmin & {
  items: OrdenDetalleItemAdmin[];
};

type GraficosData = {
  topProductos: Array<{ nombre: string; categoria: string; unidades: number; ingresos: number }>;
  ventasPorCategoria: Array<{ categoria: string; ingresos: number; unidades: number }>;
};

type ProductFormState = {
  sku: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  imagenFile: File | null;
  categoria: string;
  precio: string;
  stockMinimo: string;
};

type Section = "dashboard" | "productos" | "clientes" | "ventas" | "devoluciones" | "configuracion" | "reportes";

type PerfilUsuario = {
  id: number;
  email: string;
  rol: { nombre: "ADMIN" | "CLIENTE" };
  cliente?: {
    nombre: string;
    apellido: string;
    telefono?: string | null;
  } | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(value);

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(date);
};

const STOCK_NORMAL_COLOR = "#059669";
const STOCK_BAJO_COLOR = "#ea580c";
const STOCK_CRITICO_COLOR = "#dc2626";

const stockColor = (ratio: number) => {
  if (ratio <= 0) return STOCK_CRITICO_COLOR;
  if (ratio < 1) return STOCK_BAJO_COLOR;
  return STOCK_NORMAL_COLOR;
};

const categoryIcon = (category: string): LucideIcon => {
  const c = category.toLowerCase();
  if (c.includes("hogar")) return Home;
  if (c.includes("moda") || c.includes("ropa") || c.includes("wear")) return Shirt;
  if (c.includes("audio")) return Headphones;
  if (c.includes("movilidad") || c.includes("cel") || c.includes("phone")) return Smartphone;
  if (c.includes("monitor") || c.includes("pantalla")) return Monitor;
  if (c.includes("gaming") || c.includes("juego")) return Gamepad2;
  if (c.includes("computacion") || c.includes("laptop") || c.includes("pc")) return Laptop;
  if (c.includes("libro") || c.includes("papel") || c.includes("oficina")) return BookOpen;
  if (c.includes("deporte")) return Dumbbell;
  if (c.includes("herramienta")) return Wrench;
  if (c.includes("componente")) return Cpu;
  if (c.includes("periferico") || c.includes("accesorio")) return Briefcase;
  if (c.includes("mueble")) return Sofa;
  if (c.includes("tablet")) return Tablet;
  if (c.includes("almacen") || c.includes("otros")) return Cog;
  return Package;
};

type PieCategoryEntry = {
  name: string;
  value: number;
  stockTotal: number;
  minimoTotal: number;
  ratio: number;
  color: string;
};

type CategoryStockBarEntry = {
  name: string;
  stockTotal: number;
  percent: number;
  color: string;
};

const stockCellColor = (stock: number, minimo: number) => {
  if (stock === 0) return "text-red-600";
  if (stock <= minimo) return "text-amber-600";
  return "text-emerald-700";
};

const menuItems: Array<{ id: Section; title: string; subtitle: string; icon: typeof ShoppingBag }> = [
  { id: "dashboard", title: "Dashboard", subtitle: "Resumen general", icon: TrendingUp },
  { id: "productos", title: "Productos", subtitle: "Catalogo y fotos", icon: Package },
  { id: "clientes", title: "Clientes", subtitle: "Base de clientes", icon: Users },
  { id: "ventas", title: "Historial de ventas", subtitle: "Consultas por fecha y cliente", icon: ShoppingBag },
  { id: "devoluciones", title: "Devoluciones", subtitle: "Productos devueltos por clientes", icon: RotateCcw },
  { id: "reportes", title: "Reportes", subtitle: "PDF y Excel para tu empresa", icon: BarChart2 },
  { id: "configuracion", title: "Configuracion", subtitle: "Datos personales y seguridad", icon: Settings }
];

export const AdminPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  type Periodo = "dia" | "semana" | "mes" | "trimestre" | "anio" | "todo";
  const PERIODOS: { value: Periodo; label: string }[] = [
    { value: "dia",       label: "Hoy" },
    { value: "semana",    label: "7 dias" },
    { value: "mes",       label: "Este mes" },
    { value: "trimestre", label: "Trimestre" },
    { value: "anio",      label: "Este año" },
    { value: "todo",      label: "Historico" },
  ];
  const [graficoPeriodo, setGraficoPeriodo] = useState<Periodo>("todo");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<Producto | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<UsuarioAdmin | null>(null);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");
  const [perfilEmail, setPerfilEmail] = useState("");
  const [perfilNombre, setPerfilNombre] = useState("");
  const [perfilApellido, setPerfilApellido] = useState("");
  const [perfilTelefono, setPerfilTelefono] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmStatusProduct, setConfirmStatusProduct] = useState<Producto | null>(null);
  const [confirmStatusClient, setConfirmStatusClient] = useState<UsuarioAdmin | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productCategoriaFiltro, setProductCategoriaFiltro] = useState("todos");
  const [productEstadoFiltro, setProductEstadoFiltro] = useState<"todos" | "activos" | "inactivos">("activos");
  const [productStockFiltro, setProductStockFiltro] = useState<"todos" | "agotado" | "critico" | "normal">("todos");
  const [clientSearch, setClientSearch] = useState("");
  const [clientEstadoFiltro, setClientEstadoFiltro] = useState<"todos" | "activos" | "inactivos">("activos");
  const [orderDetail, setOrderDetail] = useState<OrdenDetalleAdmin | null>(null);
  const [isOrderDetailLoading, setIsOrderDetailLoading] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [cancelOrderTarget, setCancelOrderTarget] = useState<OrdenAdmin | null>(null);
  const [devolucionTarget, setDevolucionTarget] = useState<OrdenAdmin | null>(null);
  const [clienteHistorialView, setClienteHistorialView] = useState<UsuarioAdmin | null>(null);
  const [historialDesde, setHistorialDesde] = useState("");
  const [historialHasta, setHistorialHasta] = useState("");

  // Configuración de empresa (persiste en localStorage)
  const [empresaNombre, setEmpresaNombre] = useState(() => localStorage.getItem("emp_nombre") ?? "MI EMPRESA");
  const [empresaRuc, setEmpresaRuc] = useState(() => localStorage.getItem("emp_ruc") ?? "");
  const [empresaDireccion, setEmpresaDireccion] = useState(() => localStorage.getItem("emp_direccion") ?? "");
  const [empresaTelefono, setEmpresaTelefono] = useState(() => localStorage.getItem("emp_telefono") ?? "");
  const [empresaEmail, setEmpresaEmail] = useState(() => localStorage.getItem("emp_email") ?? "");
  const [empresaIgv, setEmpresaIgv] = useState(() => localStorage.getItem("emp_igv") ?? "18");
  const [empresaMonedaSimbolo, setEmpresaMonedaSimbolo] = useState(() => localStorage.getItem("emp_moneda_simbolo") ?? "S/");
  const [empresaMonedaNombre, setEmpresaMonedaNombre] = useState(() => localStorage.getItem("emp_moneda_nombre") ?? "Soles");
  const [empresaSerieBoleta, setEmpresaSerieBoleta] = useState(() => localStorage.getItem("emp_serie_boleta") ?? "B001");
  const [empresaSerieFactura, setEmpresaSerieFactura] = useState(() => localStorage.getItem("emp_serie_factura") ?? "F001");
  const [empresaLogo, setEmpresaLogo] = useState(() => localStorage.getItem("emp_logo") ?? "");

  const saveEmpresaConfig = () => {
    localStorage.setItem("emp_nombre", empresaNombre);
    localStorage.setItem("emp_ruc", empresaRuc);
    localStorage.setItem("emp_direccion", empresaDireccion);
    localStorage.setItem("emp_telefono", empresaTelefono);
    localStorage.setItem("emp_email", empresaEmail);
    localStorage.setItem("emp_igv", empresaIgv);
    localStorage.setItem("emp_moneda_simbolo", empresaMonedaSimbolo);
    localStorage.setItem("emp_moneda_nombre", empresaMonedaNombre);
    localStorage.setItem("emp_serie_boleta", empresaSerieBoleta);
    localStorage.setItem("emp_serie_factura", empresaSerieFactura);
    localStorage.setItem("emp_logo", empresaLogo);
    globalThis.dispatchEvent(new CustomEvent("store-config-updated"));
    toast.success("Configuración de empresa guardada");
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setEmpresaLogo(result);
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const { data: kpiData } = useQuery({
    queryKey: ["kpis"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Kpi }>("/reportes/kpis");
      return response.data.data;
    },
    refetchInterval: 30_000
  });

  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: { items: Producto[] } }>("/catalogo?page=1&limit=100&incluirInactivos=true");
      return response.data.data.items;
    }
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: UsuarioAdmin[] }>("/usuarios?incluirInactivos=true");
      return response.data.data;
    }
  });

  const { data: meData } = useQuery({
    queryKey: ["mi-perfil"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: PerfilUsuario }>("/usuarios/me");
      return response.data.data;
    }
  });

  useEffect(() => {
    if (meData) {
      setPerfilEmail(meData.email || "");
      setPerfilNombre(meData.cliente?.nombre || "");
      setPerfilApellido(meData.cliente?.apellido || "");
      setPerfilTelefono(meData.cliente?.telefono || "");
    }
  }, [meData]);

  const { data: inventoryData } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: InventarioItem[] }>("/inventario");
      return response.data.data;
    },
    refetchInterval: 30_000
  });

  const { data: ordersData } = useQuery({
    queryKey: ["admin-orders", { clienteFiltro, desdeFiltro, hastaFiltro }],
    queryFn: async () => {
      const response = await apiClient.get<{ data: OrdenAdmin[] }>("/ordenes", {
        params: {
          cliente: clienteFiltro || undefined,
          desde: desdeFiltro || undefined,
          hasta: hastaFiltro || undefined
        }
      });
      return response.data.data;
    },
    refetchInterval: 30_000
  });

  const { data: ordersAllData } = useQuery({
    queryKey: ["admin-orders-all"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: OrdenAdmin[] }>("/ordenes");
      return response.data.data;
    },
    refetchInterval: 30_000
  });

  const clienteId = clienteHistorialView?.cliente?.id;
  const { data: historialData, isLoading: isHistorialLoading } = useQuery({
    queryKey: ["cliente-historial", clienteId, historialDesde, historialHasta],
    queryFn: async () => {
      const response = await apiClient.get<{ data: OrdenAdmin[] }>("/ordenes", {
        params: {
          clienteId,
          desde: historialDesde || undefined,
          hasta: historialHasta || undefined
        }
      });
      return response.data.data;
    },
    enabled: !!clienteId
  });

  const { data: graficosData } = useQuery({
    queryKey: ["admin-graficos", graficoPeriodo],
    queryFn: async () => {
      const response = await apiClient.get<{ data: GraficosData }>(`/reportes/graficos?periodo=${graficoPeriodo}`);
      return response.data.data;
    },
    refetchInterval: 60_000
  });

  const createProduct = useMutation({
    mutationFn: async (payload: ProductFormState) => {
      const formData = new FormData();
      formData.append("sku", payload.sku);
      formData.append("nombre", payload.nombre);
      if (payload.descripcion) formData.append("descripcion", payload.descripcion);
      formData.append("categoria", payload.categoria);
      formData.append("precio", String(Number(payload.precio)));
      formData.append("stockMinimo", String(Number(payload.stockMinimo || 0)));
      if (payload.imagenFile) formData.append("imagen", payload.imagenFile);

      await apiClient.post("/catalogo", formData);
    },
    onSuccess: () => {
      toast.success("Producto creado");
      setIsModalOpen(false);
      setModalProduct(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo crear el producto");
    }
  });

  const updateProduct = useMutation({
    mutationFn: async (payload: ProductFormState & { id: number }) => {
      const formData = new FormData();
      formData.append("nombre", payload.nombre);
      if (payload.descripcion) formData.append("descripcion", payload.descripcion);
      formData.append("categoria", payload.categoria);
      formData.append("precio", String(Number(payload.precio)));
      if (payload.imagenFile) formData.append("imagen", payload.imagenFile);

      await apiClient.patch(`/catalogo/${payload.id}`, formData);
    },
    onSuccess: () => {
      toast.success("Producto actualizado");
      setIsModalOpen(false);
      setModalProduct(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo actualizar el producto");
    }
  });

  const toggleProductStatus = useMutation({
    mutationFn: async (payload: { id: number; activo: boolean }) => {
      await apiClient.patch(`/catalogo/${payload.id}/estado`, { activo: payload.activo });
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.activo ? "Producto activado" : "Producto inactivado");
      setConfirmStatusProduct(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo cambiar el estado del producto");
    }
  });

  const updateMiPerfil = useMutation({
    mutationFn: async () => {
      await apiClient.patch("/usuarios/me", {
        email: perfilEmail,
        nombre: perfilNombre || undefined,
        apellido: perfilApellido || undefined,
        telefono: perfilTelefono || undefined
      });
    },
    onSuccess: () => {
      toast.success("Perfil actualizado");
      queryClient.invalidateQueries({ queryKey: ["mi-perfil"] });
    }
  });

  const updateMiPassword = useMutation({
    mutationFn: async () => {
      await apiClient.patch("/usuarios/me/password", {
        currentPassword,
        newPassword
      });
    },
    onSuccess: () => {
      toast.success("Contrasena actualizada");
      setCurrentPassword("");
      setNewPassword("");
    }
  });

  const updateCredencialesCliente = useMutation({
    mutationFn: async (payload: {
      id: number;
      email?: string;
      password?: string;
      nombre?: string;
      apellido?: string;
      telefono?: string;
      activo?: boolean;
    }) => {
      await apiClient.patch(`/usuarios/${payload.id}/credenciales`, payload);
    },
    onSuccess: () => {
      toast.success("Credenciales de cliente actualizadas");
      setIsClientModalOpen(false);
      setSelectedClient(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  });

  const toggleClientStatus = useMutation({
    mutationFn: async (payload: { id: number; activo: boolean }) => {
      await apiClient.patch(`/usuarios/${payload.id}/credenciales`, { activo: payload.activo });
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.activo ? "Cliente restaurado" : "Cliente eliminado");
      setConfirmStatusClient(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo actualizar el estado del cliente");
    }
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiClient.post(`/ordenes/${orderId}/anular`);
    },
    onSuccess: (_data, orderId) => {
      toast.success("Venta anulada y stock revertido");
      setCancelOrderTarget(null);
      setOrderDetail((prev) => (prev?.id === orderId ? { ...prev, estado: "ANULADA" } : prev));
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders-all"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo anular la venta");
    }
  });

  const devolucionMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiClient.post(`/ordenes/${orderId}/devolucion`);
    },
    onSuccess: (_data, orderId) => {
      toast.success("Devolución registrada y stock repuesto");
      setDevolucionTarget(null);
      setOrderDetail((prev) => (prev?.id === orderId ? { ...prev, estado: "DEVUELTA" } : prev));
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders-all"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo registrar la devolución");
    }
  });

  const products = useMemo(() => productsData ?? [], [productsData]);
  const users = useMemo(() => usersData ?? [], [usersData]);
  const inventory = useMemo(() => inventoryData ?? [], [inventoryData]);
  const orders = useMemo(() => ordersData ?? [], [ordersData]);
  const allOrders = useMemo(() => ordersAllData ?? [], [ordersAllData]);

  const productCategorias = useMemo(
    () => Array.from(new Set(products.map((p) => p.categoria))).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const filtered = products.filter((p) => {
      const stock = Number(p.inventario?.stock_disponible ?? 0);
      const stockCritico = stock <= Number(p.stock_minimo);

      const matchSearch = !q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchCategoria = productCategoriaFiltro === "todos" || p.categoria === productCategoriaFiltro;
      const matchEstado =
        productEstadoFiltro === "todos" ||
        (productEstadoFiltro === "activos" ? p.activo : !p.activo);
      const matchStock =
        productStockFiltro === "todos" ||
        (productStockFiltro === "agotado" && stock === 0) ||
        (productStockFiltro === "critico" && stock > 0 && stockCritico) ||
        (productStockFiltro === "normal" && !stockCritico);

      return matchSearch && matchCategoria && matchEstado && matchStock;
    });
    if (productEstadoFiltro === "todos") {
      return filtered.sort((a, b) => Number(b.activo) - Number(a.activo));
    }
    return filtered;
  }, [products, productSearch, productCategoriaFiltro, productEstadoFiltro, productStockFiltro]);

  const clientes = useMemo(() => users.filter((u) => u.rol.nombre === "CLIENTE"), [users]);

  const filteredClientes = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const filtered = clientes.filter((u) => {
      const nombre = `${u.cliente?.nombre ?? ""} ${u.cliente?.apellido ?? ""}`.trim().toLowerCase();
      const email = u.email.toLowerCase();
      const telefono = (u.cliente?.telefono ?? "").toLowerCase();
      const matchSearch = !q || nombre.includes(q) || email.includes(q) || telefono.includes(q);
      const matchEstado = clientEstadoFiltro === "todos" || (clientEstadoFiltro === "activos" ? u.activo : !u.activo);
      return matchSearch && matchEstado;
    });
    if (clientEstadoFiltro === "todos") {
      return filtered.sort((a, b) => Number(b.activo) - Number(a.activo));
    }
    return filtered;
  }, [clientes, clientSearch, clientEstadoFiltro]);

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

  const stockBajo = useMemo(
    () => inventory
      .filter((item) => Number(item.stock_disponible) <= Number(item.producto.stock_minimo))
      .sort((a, b) => Number(a.stock_disponible) - Number(b.stock_disponible)),
    [inventory]
  );

  const categoryData = useMemo((): PieCategoryEntry[] => {
    const grouped = products.reduce<Record<string, { count: number; stockTotal: number; minimoTotal: number }>>((acc, p) => {
      if (!acc[p.categoria]) acc[p.categoria] = { count: 0, stockTotal: 0, minimoTotal: 0 };
      acc[p.categoria].count++;
      const inv = inventory.find((i) => i.producto.id === p.id);
      acc[p.categoria].stockTotal += Number(inv?.stock_disponible ?? 0);
      acc[p.categoria].minimoTotal += Number(p.stock_minimo);
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, { count, stockTotal, minimoTotal }]) => {
      const ratio = minimoTotal > 0 ? stockTotal / minimoTotal : 1;
      return { name, value: count, stockTotal, minimoTotal, ratio, color: stockColor(ratio) };
    });
  }, [products, inventory]);

  const fetchOrderDetail = async (orderId: number) => {
    const response = await apiClient.get<{ data: OrdenDetalleAdmin }>(`/ordenes/${orderId}`);
    return response.data.data;
  };

  const buildReceiptHtml = (detail: OrdenDetalleAdmin, autoPrint = false) => {
    const customerName = detail.cliente ? `${detail.cliente.nombre} ${detail.cliente.apellido}` : `Cliente #${detail.cliente_id}`;
    const lineItems = detail.items
      .map(
        (item) => `
          <tr>
            <td>${item.cantidad}</td>
            <td>${item.producto.nombre}</td>
            <td style="text-align:right">${Number(item.total_linea).toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Comprobante ${detail.numero_orden}</title>
          <style>
            body { background: #4b5563; margin: 0; padding: 16px; font-family: "Courier New", monospace; }
            .ticket { max-width: 560px; margin: 0 auto; background: #fff; padding: 18px 24px 22px; color: #0f172a; }
            .logo { display: block; max-height: 60px; max-width: 120px; margin: 0 auto 6px; object-fit: contain; }
            h1 { text-align: center; margin: 0 0 2px; font-size: 28px; letter-spacing: 1px; }
            .subtitle { text-align: center; font-size: 12px; margin: 1px 0; }
            .line { border-top: 2px dashed #444; margin: 8px 0; }
            .meta p { margin: 1px 0; font-size: 13px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
            th, td { padding: 3px 0; vertical-align: top; }
            th { text-align: left; border-bottom: 1px solid #ddd; }
            .total { font-size: 18px; font-weight: 900; display: flex; justify-content: space-between; margin-top: 4px; }
            .small { font-size: 13px; margin: 2px 0; }
            .footer { text-align: center; margin-top: 10px; font-size: 13px; font-weight: 700; }
            .footer-note { text-align: center; font-size: 11px; margin-top: 3px; }
            @media print {
              @page { margin: 8mm; size: A4 portrait; }
              html, body { height: auto; }
              body { background: white; padding: 0; }
              .ticket { max-width: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <article class="ticket">
            ${empresaLogo ? `<img class="logo" src="${empresaLogo}" alt="Logo" />` : ""}
            <h1>${empresaNombre}</h1>
            ${empresaRuc ? `<p class="subtitle">RUC: ${empresaRuc}</p>` : ""}
            ${empresaDireccion ? `<p class="subtitle">${empresaDireccion}</p>` : ""}
            ${empresaTelefono ? `<p class="subtitle">Tel: ${empresaTelefono}</p>` : ""}
            <div class="line"></div>
            <section class="meta">
              <p>TICKET: ${detail.numero_orden}</p>
              <p>FECHA: ${formatDateTime(detail.created_at)}</p>
              <p>CLIENTE: ${customerName}</p>
              <p>DOC: ${detail.cliente_id}</p>
            </section>
            <div class="line"></div>
            <table>
              <thead>
                <tr>
                  <th style="width:50px">CANT</th>
                  <th>DESCRIPCION</th>
                  <th style="width:90px; text-align:right">IMP.</th>
                </tr>
              </thead>
              <tbody>
                ${lineItems}
              </tbody>
            </table>
            <div class="line"></div>
            <p class="small" style="display:flex;justify-content:space-between"><span>OP. GRAVADA:</span><strong>${empresaMonedaSimbolo} ${Number(detail.subtotal).toFixed(2)}</strong></p>
            <p class="small" style="display:flex;justify-content:space-between"><span>IGV (${empresaIgv}%):</span><strong>${empresaMonedaSimbolo} ${Number(detail.impuestos).toFixed(2)}</strong></p>
            <p class="total"><span>TOTAL:</span><span>${empresaMonedaSimbolo} ${Number(detail.total).toFixed(2)}</span></p>
            <div class="line"></div>
            <p class="small"><strong>TIPO PAGO:</strong> ${detail.metodo_pago}</p>
            <p class="small"><strong>ESTADO:</strong> ${detail.estado}</p>
            <div class="footer">GRACIAS POR SU COMPRA</div>
            <div class="footer-note">Conserve este ticket para devoluciones o reclamos.</div>
          </article>
          <script>
            ${autoPrint ? "window.print();" : ""}
          </script>
        </body>
      </html>
    `;
  };

  const openReceiptWindow = (detail: OrdenDetalleAdmin, autoPrint = false) => {
    const html = buildReceiptHtml(detail, autoPrint);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "width=520,height=900");
    if (!win) {
      toast.error("El navegador bloqueó la ventana. Permite ventanas emergentes para este sitio e intenta de nuevo.");
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const openOrderDetail = async (orderId: number) => {
    try {
      setIsOrderDetailLoading(true);
      const data = await fetchOrderDetail(orderId);
      setOrderDetail(data);
      setIsOrderModalOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar el detalle";
      toast.error(message);
    } finally {
      setIsOrderDetailLoading(false);
    }
  };

  const downloadOrderDetail = async (order: OrdenAdmin) => {
    try {
      const detail = orderDetail?.id === order.id ? orderDetail : await fetchOrderDetail(order.id);
      const html = buildReceiptHtml(detail);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprobante-${detail.numero_orden}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo descargar el detalle";
      toast.error(message);
    }
  };

  const printOrderDetail = async (order: OrdenAdmin) => {
    try {
      const detail = orderDetail?.id === order.id ? orderDetail : await fetchOrderDetail(order.id);
      openReceiptWindow(detail, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo imprimir el comprobante";
      toast.error(message);
    }
  };

  const requestCancelOrder = (order: OrdenAdmin) => {
    setCancelOrderTarget(order);
  };

  const executeCancelOrder = () => {
    if (!cancelOrderTarget) return;
    cancelOrderMutation.mutate(cancelOrderTarget.id);
  };

  const statusStyles = (estado: string) => {
    const normalized = estado.toUpperCase();
    if (normalized === "ANULADA") return "bg-rose-50 text-rose-700 border border-rose-200";
    if (normalized === "DEVUELTA") return "bg-amber-50 text-amber-700 border border-amber-200";
    if (normalized === "PAGADA") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  const isOrderClosed = (estado: string) => {
    const n = estado.toUpperCase();
    return n === "ANULADA" || n === "DEVUELTA";
  };

  const devolucionesData = useMemo(
    () => allOrders.filter((order) => order.estado.toUpperCase() === "DEVUELTA"),
    [allOrders]
  );
  const categoryBars = useMemo((): CategoryStockBarEntry[] => {  
    const totalStock = categoryData.reduce((sum, item) => sum + item.stockTotal, 0);  
    const sorted = [...categoryData]  
      .sort((a, b) => b.stockTotal - a.stockTotal)  
      .map((item) => ({  
        name: item.name,  
        stockTotal: item.stockTotal,  
        percent: totalStock > 0 ? (item.stockTotal / totalStock) * 100 : 0,  
        color: item.color  
      }));  
  
    const TOP_CATEGORIES = 7;  
    if (sorted.length <= TOP_CATEGORIES) return sorted;  
  
    const top = sorted.slice(0, TOP_CATEGORIES);  
    const others = sorted.slice(TOP_CATEGORIES);  
    const othersStock = others.reduce((sum, item) => sum + item.stockTotal, 0);  
    const othersPercent = others.reduce((sum, item) => sum + item.percent, 0);  
  
    return [  
      ...top,  
      {  
        name: "Otros",  
        stockTotal: othersStock,  
        percent: othersPercent,  
        color: "#64748b"  
      }  
    ];  
  }, [categoryData]);  

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

  const [isDownloadingPdf, setIsDownloadingPdf] = useState<string | null>(null);

  const downloadExcel = (filename: string, headers: string[], rows: Array<Array<string | number>>) => {
    const wb = XLSX.utils.book_new();
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ancho automático por columna
    const colWidths = headers.map((h, ci) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map((r) => String(r[ci] ?? "").length)
      );
      return { wch: Math.min(maxLen + 4, 40) };
    });
    ws["!cols"] = colWidths;

    // Negrita y relleno en cabecera
    headers.forEach((_, ci) => {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (!ws[cellAddr]) return;
      ws[cellAddr].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E3A8A" }, patternType: "solid" },
        alignment: { horizontal: "center" },
        border: {
          bottom: { style: "thin", color: { rgb: "94A3B8" } }
        }
      };
    });

    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success("Excel descargado correctamente");
  };

  const filtrarPorPeriodo = <T extends { created_at: string }>(items: T[], periodo: string): T[] => {
    if (periodo === "todo") return items;
    const now = new Date();
    let desde: Date;
    if (periodo === "dia")       { desde = new Date(now); desde.setHours(0, 0, 0, 0); }
    else if (periodo === "semana")    { desde = new Date(now); desde.setDate(desde.getDate() - 6); desde.setHours(0, 0, 0, 0); }
    else if (periodo === "mes")       { desde = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (periodo === "trimestre") { desde = new Date(now.getFullYear(), now.getMonth() - 2, 1); }
    else if (periodo === "anio")      { desde = new Date(now.getFullYear(), 0, 1); }
    else return items;
    return items.filter((item) => new Date(item.created_at) >= desde);
  };

  const downloadBackendPdf = async (path: string, filename: string) => {
    setIsDownloadingPdf(filename);
    const empresa = encodeURIComponent(empresaNombre.trim() || "Tienda Virtual");
    const fullPath = `${path}?empresa=${empresa}`;
    try {
      const response = await apiClient.get<Blob>(fullPath, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF descargado correctamente");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al generar el reporte";
      toast.error(message);
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  const printTableReport = (title: string, headers: string[], rows: Array<Array<string | number>>) => {
    const tableRows = rows
      .map((row) => {
        const cells = row.map((cell) => `<td>${String(cell)}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    const html = `<!doctype html><html><head><meta charset="UTF-8"/><title>${title}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:24px;color:#0f172a;font-size:12px}
        h1{font-size:18px;margin-bottom:2px}
        .meta{font-size:11px;color:#64748b;margin-bottom:16px}
        table{width:100%;border-collapse:collapse}
        thead th{background:#0f172a;color:#fff;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
        tbody tr:nth-child(even){background:#f8fafc}
        tbody td{padding:6px 10px;border-bottom:1px solid #e2e8f0}
        tfoot td{padding:8px 10px;font-weight:700;border-top:2px solid #0f172a}
        @media print{@page{margin:10mm;size:A4 landscape}body{margin:0}}
      </style></head>
      <body>
        <h1>${title}</h1>
        <p class="meta">Emitido: ${new Date().toLocaleString("es-PE")} &nbsp;|&nbsp; ${empresaNombre}${empresaRuc ? ` &nbsp;|&nbsp; RUC: ${empresaRuc}` : ""}</p>
        <table>
          <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <script>window.print();</script>
      </body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "width=1000,height=750");
    if (!win) {
      toast.error("El navegador bloqueó la ventana. Permite ventanas emergentes para este sitio e intenta de nuevo.");
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const sidebarContent = (
    <div className="h-full flex flex-col bg-gradient-to-b from-violet-700 to-violet-500 text-white rounded-2xl shadow-lg border border-white/10 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-white/15 flex items-center gap-3">
        {empresaLogo ? (
          <img src={empresaLogo} alt="Logo" className="h-10 w-10 rounded-lg object-contain bg-white/20 p-1 shrink-0" />
        ) : null}
        <div className="min-w-0">
          <p className="text-xs text-violet-100">Sistema de Gestion</p>
          <h2 className="text-xl font-extrabold leading-tight truncate">{empresaNombre}</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveSection(item.id);
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl transition ${activeSection === item.id ? "bg-white/25" : "hover:bg-white/15"}`}
          >
            <div className="flex items-center gap-2">
              <item.icon className="w-4 h-4 text-violet-100" />
              <p className="font-bold">{item.title}</p>
            </div>
            <p className="text-xs text-violet-100 ml-6">{item.subtitle}</p>
          </button>
        ))}
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-white/15">
        <div className="rounded-xl bg-white/15 p-4">
          <p className="text-xs uppercase tracking-wide text-violet-100">Administrador</p>
          <p className="text-xl font-extrabold">Panel activo</p>
        </div>
      </div>
    </div>
  );

  const sidebarCard = (
    <aside className="hidden xl:block xl:col-span-3">
      <div className="sticky top-5 h-[calc(100vh-2.5rem)]">
        {sidebarContent}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className={`xl:hidden fixed inset-0 z-[70] transition ${mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={() => setMobileMenuOpen(false)}
          className={`absolute inset-0 bg-slate-900/45 transition-opacity ${mobileMenuOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside className={`absolute inset-y-0 left-0 w-[86vw] max-w-[320px] p-3 transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          {sidebarContent}
        </aside>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-5">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {sidebarCard}

          {/* Trigger drawer para movil (< xl) */}
          <div className="xl:hidden col-span-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="w-full flex items-center justify-between gap-3 bg-gradient-to-r from-violet-700 to-violet-500 text-white rounded-2xl px-4 py-3 shadow-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                {(() => { const active = menuItems.find((m) => m.id === activeSection); return active ? <active.icon className="w-5 h-5 shrink-0" /> : null; })()}
                <span className="font-bold text-base truncate">{menuItems.find((m) => m.id === activeSection)?.title}</span>
              </div>
              <Menu className="w-5 h-5 shrink-0" />
            </button>
          </div>

          <main className="xl:col-span-9 space-y-4 xl:space-y-0 xl:gap-4 xl:sticky xl:top-5 xl:h-[calc(100vh-2.5rem)] xl:flex xl:flex-col xl:overflow-hidden">
            <div className="shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-extrabold text-slate-800 truncate">{menuItems.find((m) => m.id === activeSection)?.title}</h1>
                <p className="text-xs text-slate-500 truncate">{menuItems.find((m) => m.id === activeSection)?.subtitle}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    void queryClient.invalidateQueries({ queryKey: ["kpis"] });
                    void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
                    void queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
                    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
                    void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                    void queryClient.invalidateQueries({ queryKey: ["admin-graficos"] });
                  }}
                  className="btn-secondary inline-flex items-center gap-1.5 text-sm px-3 py-2"
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span className="hidden xs:inline sm:inline">Actualizar</span>
                </button>
                <button type="button" onClick={handleLogout} className="btn-danger inline-flex items-center gap-1.5 text-sm px-3 py-2">
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="hidden xs:inline sm:inline">Salir</span>
                </button>
              </div>
            </div>

            {activeSection === "dashboard" && (
              <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto space-y-4 xl:space-y-4 pb-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-slate-500">Ventas hoy</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-fuchsia-600 truncate">{formatCurrency(ventasHoy)}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-slate-500">Total ventas</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-violet-700 truncate">{formatCurrency(Number(kpiData?.ventasTotales || 0))}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-slate-500">Ticket promedio</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 truncate">{formatCurrency(Number(kpiData?.ticketPromedio || 0))}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-slate-500">Stock critico</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-rose-600">{stockBajo.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-3">Tendencia de ventas (7 dias)</h3>
                    <div className="flex-1 min-h-0" style={{ minHeight: "200px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                          <Line type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4, fill: "#7c3aed" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-0.5">Stock por categoria</h3>
                    <p className="text-xs text-slate-500 mb-3">% del stock total disponible</p>
                    <div className="space-y-2.5">  
                      {categoryBars.map((entry) => (  
                        <div key={entry.name}>  
                          <div className="flex items-center justify-between gap-2 mb-1">  
                            <div className="min-w-0 flex items-center gap-1.5">  
                              {(() => {
                                const Icon = categoryIcon(entry.name);
                                return <Icon size={14} className="shrink-0" style={{ color: entry.color }} />;
                              })()}  
                              <span className="text-xs sm:text-sm text-slate-700 truncate">{entry.name}</span>  
                            </div>  
                            <span className="text-xs sm:text-sm font-bold text-slate-800 shrink-0">{entry.percent.toFixed(1)}%</span>  
                          </div>  
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">  
                            <div className="h-full rounded-full" style={{ width: `${Math.max(entry.percent, 1)}%`, backgroundColor: entry.color }} />  
                          </div>  
                        </div>  
                      ))}  
                    </div>  
                  </div>
                </div>

                {/* Top productos vendidos + Ventas por categoría */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm">Graficos de ventas</p>
                    <p className="text-xs text-slate-500 truncate">Periodo: {PERIODOS.find((p) => p.value === graficoPeriodo)?.label}</p>
                  </div>
                  <select
                    value={graficoPeriodo}
                    onChange={(e) => setGraficoPeriodo(e.target.value as Periodo)}
                    className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                  >
                    {PERIODOS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-bold text-slate-800 leading-tight">Top 8 productos mas vendidos</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Unidades totales despachadas por producto</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">{PERIODOS.find((p) => p.value === graficoPeriodo)?.label}</span>
                    </div>
                    {graficosData?.topProductos.length ? (
                      <div className="h-64 mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={graficosData.topProductos} layout="vertical" margin={{ left: 8, right: 32 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <YAxis
                              type="category"
                              dataKey="nombre"
                              width={110}
                              tick={{ fontSize: 10, fill: "#475569" }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 14)}…` : v}
                            />
                            <Tooltip
                              cursor={{ fill: "#f1f5f9" }}
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload as { nombre: string; categoria: string; unidades: number; ingresos: number };
                                return (
                                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
                                    <p className="font-bold text-slate-800 mb-1">{d.nombre}</p>
                                    <p className="text-slate-500">Categoria: <span className="font-medium text-slate-700">{d.categoria}</span></p>
                                    <p className="text-violet-700 font-semibold">{d.unidades} unidades vendidas</p>
                                    <p className="text-emerald-700 font-semibold">S/ {d.ingresos.toFixed(2)} en ingresos</p>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="unidades" name="Unidades vendidas" fill="#7c3aed" radius={[0, 4, 4, 0]} maxBarSize={18} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 py-10 text-center">Sin datos de ventas aun</p>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-bold text-slate-800 leading-tight">Ingresos y unidades por categoria</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Total acumulado desde el inicio de operaciones</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{PERIODOS.find((p) => p.value === graficoPeriodo)?.label}</span>
                    </div>
                    {graficosData?.ventasPorCategoria.length ? (
                      <div className="h-64 mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={graficosData.ventasPorCategoria} margin={{ left: 8, right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="categoria"
                              tick={{ fontSize: 10, fill: "#475569" }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v: string) => v.length > 8 ? `${v.slice(0, 7)}…` : v}
                            />
                            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `S/${v}`} />
                            <Tooltip
                              cursor={{ fill: "#f8fafc" }}
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const ing = payload.find((p) => p.dataKey === "ingresos");
                                const uni = payload.find((p) => p.dataKey === "unidades");
                                return (
                                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
                                    <p className="font-bold text-slate-800 mb-1">{String(label)}</p>
                                    <p className="text-blue-700 font-semibold">S/ {Number(ing?.value ?? 0).toFixed(2)} en ingresos</p>
                                    <p className="text-emerald-700 font-semibold">{Number(uni?.value ?? 0)} unidades vendidas</p>
                                  </div>
                                );
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === "ingresos" ? "Ingresos (S/)" : "Unidades"} />
                            <Bar dataKey="ingresos" name="ingresos" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="unidades" name="unidades" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 py-10 text-center">Sin datos de ventas aun</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-x-auto">
                  <h3 className="font-bold text-slate-800 mb-3 text-center">Reporte de stock bajo</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-center text-slate-500 border-b">
                        <th className="py-2">Producto</th>
                        <th className="py-2">Categoria</th>
                        <th className="py-2">Stock actual</th>
                        <th className="py-2">Stock minimo</th>
                        <th className="py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockBajo.slice(0, 40).map((item) => {
                        const zero = Number(item.stock_disponible) === 0;
                        return (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="py-2 font-semibold text-slate-700">{item.producto.nombre}</td>
                            <td className="py-2">{item.producto.categoria}</td>
                            <td className={`py-2 text-center font-bold ${zero ? "text-red-600" : "text-amber-600"}`}>{item.stock_disponible}</td>
                            <td className="py-2 text-center">{item.producto.stock_minimo}</td>
                            <td className="py-2 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${zero ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                {zero ? <Ban className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                {zero ? "Agotado" : "Critico"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "productos" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm xl:flex-1 xl:min-h-0 xl:flex xl:flex-col xl:overflow-hidden">
                <div className="shrink-0 p-4 sm:p-5 xl:border-b xl:border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Catalogo de productos</h3>
                    <p className="text-sm text-slate-500">Gestion visual de stock, precios y acciones</p>
                  </div>
                  <button
                    onClick={() => {
                      setModalProduct(null);
                      setIsModalOpen(true);
                    }}
                    className="btn-primary inline-flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Crear Producto
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs text-slate-500">Total productos</p>
                    <p className="text-xl font-extrabold text-slate-800">{products.length}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="text-xs text-amber-700">Stock bajo o critico</p>
                    <p className="text-xl font-extrabold text-amber-700">
                      {products.filter((p) => Number(p.inventario?.stock_disponible ?? 0) <= Number(p.stock_minimo)).length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
                    <p className="text-xs text-violet-700">Categorias activas</p>
                    <p className="text-xl font-extrabold text-violet-700">{new Set(products.map((p) => p.categoria)).size}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-4">
                  <input
                    className="input-field"
                    placeholder="Buscar por nombre o SKU"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  <select
                    className="input-field"
                    value={productCategoriaFiltro}
                    onChange={(e) => setProductCategoriaFiltro(e.target.value)}
                  >
                    <option value="todos">Todas las categorias</option>
                    {productCategorias.map((categoria) => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                  <select
                    className="input-field"
                    value={productEstadoFiltro}
                    onChange={(e) => setProductEstadoFiltro(e.target.value as "todos" | "activos" | "inactivos")}
                  >
                    <option value="activos">Solo activos</option>
                    <option value="todos">Todos (incluye eliminados)</option>
                    <option value="inactivos">Solo eliminados</option>
                  </select>
                  <select
                    className="input-field"
                    value={productStockFiltro}
                    onChange={(e) => setProductStockFiltro(e.target.value as "todos" | "agotado" | "critico" | "normal")}
                  >
                    <option value="todos">Todo el stock</option>
                    <option value="agotado">Agotado</option>
                    <option value="critico">Critico</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
                </div>
                <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto p-4 sm:p-5 pt-3">
                {isProductsLoading ? (
                  <p className="text-sm text-slate-500">Cargando productos...</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-[860px] w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr className="text-left border-b border-slate-200">
                          <th className="py-3 px-3 font-semibold">Codigo</th>
                          <th className="py-3 px-3 font-semibold">Producto</th>
                          <th className="py-3 px-3 font-semibold">Categoria</th>
                          <th className="py-3 px-3 font-semibold">Precio</th>
                          <th className="py-3 px-3 font-semibold">Stock</th>
                          <th className="py-3 px-3 font-semibold">Estado</th>
                          <th className="py-3 px-3 font-semibold text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredProducts.map((p) => {
                          const stock = Number(p.inventario?.stock_disponible ?? 0);
                          const critico = stock <= Number(p.stock_minimo);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700">
                                  {p.sku}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-11 h-11 rounded-xl bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                    {p.imagen_url ? (
                                      <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                      <Package className="w-5 h-5 text-slate-500" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-800 truncate">{p.nombre}</p>
                                    <p className="text-xs text-slate-500 truncate">SKU: {p.sku}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                {(() => {
                                  const CategoryIcon = categoryIcon(p.categoria);
                                  return (
                                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-violet-100 text-violet-700">
                                      <CategoryIcon className="w-3.5 h-3.5" />
                                      {p.categoria}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-3 font-bold text-slate-800">{formatCurrency(Number(p.precio))}</td>
                              <td className="py-3 px-3">
                                <div className="inline-flex items-center gap-1.5">
                                  <span className={`font-bold ${stockCellColor(stock, p.stock_minimo)}`}>{stock}</span>
                                  {critico ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <Ban className="w-4 h-4 text-transparent" />}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${p.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                                  {p.activo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                  {p.activo ? "Activo" : "Inactivo"}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-wrap justify-center gap-2">
                                  <button
                                    type="button"
                                    title="Editar"
                                    aria-label="Editar"
                                    className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 inline-flex items-center justify-center hover:bg-slate-50"
                                    onClick={() => {
                                      setModalProduct(p);
                                      setIsModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title={p.activo ? "Eliminar" : "Restaurar"}
                                    aria-label={p.activo ? "Eliminar" : "Restaurar"}
                                    className={`h-9 w-9 rounded-lg inline-flex items-center justify-center ${p.activo ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"}`}
                                    onClick={() => setConfirmStatusProduct(p)}
                                  >
                                    {p.activo ? <Trash2 className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                </div>
                {confirmStatusProduct && (
                  <div className="fixed inset-0 z-[90] bg-slate-900/45 flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${confirmStatusProduct.activo ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
                          {confirmStatusProduct.activo ? <Trash2 className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-extrabold text-slate-800">
                            {confirmStatusProduct.activo ? "Confirmar eliminacion" : "Restaurar producto"}
                          </h4>
                          <p className="text-sm text-slate-500 mt-1">
                            {confirmStatusProduct.activo
                              ? "El producto se quitara de la vista principal sin borrarse de la base de datos."
                              : "El producto volvera a mostrarse en el listado principal de productos activos."}
                          </p>
                          <p className="text-sm font-semibold text-slate-700 mt-2 truncate">{confirmStatusProduct.nombre}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                          onClick={() => setConfirmStatusProduct(null)}
                          disabled={toggleProductStatus.isPending}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className={`h-9 px-3 rounded-lg text-white text-sm font-semibold inline-flex items-center gap-1.5 ${confirmStatusProduct.activo ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                          onClick={() => toggleProductStatus.mutate({ id: confirmStatusProduct.id, activo: !confirmStatusProduct.activo })}
                          disabled={toggleProductStatus.isPending}
                        >
                          {toggleProductStatus.isPending ? "Procesando..." : confirmStatusProduct.activo ? "Eliminar" : "Restaurar"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === "clientes" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm xl:flex-1 xl:min-h-0 xl:flex xl:flex-col xl:overflow-hidden">
                <div className="shrink-0 p-4 sm:p-5 xl:border-b xl:border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Gestion de clientes</h3>
                    <p className="text-sm text-slate-500">Control de acceso y estado comercial del cliente</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs text-slate-500">Clientes activos</p>
                    <p className="text-xl font-extrabold text-slate-800">{clientes.filter((u) => u.activo).length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  <input
                    className="input-field"
                    placeholder="Buscar por nombre, email o telefono"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                  <select
                    className="input-field"
                    value={clientEstadoFiltro}
                    onChange={(e) => setClientEstadoFiltro(e.target.value as "todos" | "activos" | "inactivos")}
                  >
                    <option value="activos">Solo activos</option>
                    <option value="todos">Todos (incluye eliminados)</option>
                    <option value="inactivos">Solo eliminados</option>
                  </select>
                </div>
                </div>
                <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto p-4 sm:p-5 pt-3">
                {isUsersLoading ? (
                  <p className="text-sm text-slate-500">Cargando clientes...</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-[780px] w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr className="text-left border-b border-slate-200">
                          <th className="py-3 px-3 font-semibold">Cliente</th>
                          <th className="py-3 px-3 font-semibold">Email</th>
                          <th className="py-3 px-3 font-semibold">Telefono</th>
                          <th className="py-3 px-3 font-semibold">Estado</th>
                          <th className="py-3 px-3 font-semibold text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredClientes.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {u.cliente ? `${u.cliente.nombre} ${u.cliente.apellido}` : "-"}
                            </td>
                            <td className="py-3 px-3 text-slate-700">{u.email}</td>
                            <td className="py-3 px-3 text-slate-700">{u.cliente?.telefono || "-"}</td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${u.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                                {u.activo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                {u.activo ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap justify-center gap-2">
                                <button
                                  type="button"
                                  title="Ver historial de compras"
                                  aria-label="Ver historial de compras"
                                  className="h-9 w-9 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 inline-flex items-center justify-center hover:bg-brand-100"
                                  onClick={() => {
                                    setHistorialDesde("");
                                    setHistorialHasta("");
                                    setClienteHistorialView(u);
                                  }}
                                >
                                  <ClipboardList className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Editar"
                                  aria-label="Editar"
                                  className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 inline-flex items-center justify-center hover:bg-slate-50"
                                  onClick={() => {
                                    setSelectedClient(u);
                                    setIsClientModalOpen(true);
                                  }}
                                >
                                  <Users className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  title={u.activo ? "Eliminar" : "Restaurar"}
                                  aria-label={u.activo ? "Eliminar" : "Restaurar"}
                                  className={`h-9 w-9 rounded-lg inline-flex items-center justify-center ${u.activo ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"}`}
                                  onClick={() => setConfirmStatusClient(u)}
                                >
                                  {u.activo ? <Trash2 className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                </div>
                {confirmStatusClient && (                  <div className="fixed inset-0 z-[90] bg-slate-900/45 flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${confirmStatusClient.activo ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
                          {confirmStatusClient.activo ? <Trash2 className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-extrabold text-slate-800">
                            {confirmStatusClient.activo ? "Confirmar eliminacion" : "Restaurar cliente"}
                          </h4>
                          <p className="text-sm text-slate-500 mt-1">
                            {confirmStatusClient.activo
                              ? "El cliente se ocultara del listado principal, sin borrar su historial en el sistema."
                              : "El cliente volvera a mostrarse como activo en el listado principal."}
                          </p>
                          <p className="text-sm font-semibold text-slate-700 mt-2 truncate">{confirmStatusClient.cliente ? `${confirmStatusClient.cliente.nombre} ${confirmStatusClient.cliente.apellido}` : confirmStatusClient.email}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                          onClick={() => setConfirmStatusClient(null)}
                          disabled={toggleClientStatus.isPending}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className={`h-9 px-3 rounded-lg text-white text-sm font-semibold ${confirmStatusClient.activo ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                          onClick={() => toggleClientStatus.mutate({ id: confirmStatusClient.id, activo: !confirmStatusClient.activo })}
                          disabled={toggleClientStatus.isPending}
                        >
                          {toggleClientStatus.isPending ? "Procesando..." : confirmStatusClient.activo ? "Eliminar" : "Restaurar"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal historial de compras por cliente */}
            {clienteHistorialView && (
              <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
                <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl">
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-brand-700" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-800">
                          Historial de compras
                        </h4>
                        <p className="text-xs text-slate-500">
                          {clienteHistorialView.cliente
                            ? `${clienteHistorialView.cliente.nombre} ${clienteHistorialView.cliente.apellido}`
                            : clienteHistorialView.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Cerrar"
                      className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 inline-flex items-center justify-center hover:bg-slate-50"
                      onClick={() => setClienteHistorialView(null)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Filtros de fecha */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-end gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Desde</p>
                      <input
                        type="date"
                        className="input-field text-sm py-1.5"
                        value={historialDesde}
                        onChange={(e) => setHistorialDesde(e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Hasta</p>
                      <input
                        type="date"
                        className="input-field text-sm py-1.5"
                        value={historialHasta}
                        onChange={(e) => setHistorialHasta(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-100 inline-flex items-center gap-1.5"
                      onClick={() => { setHistorialDesde(""); setHistorialHasta(""); }}
                    >
                      <FilterX className="w-3.5 h-3.5" />
                      Limpiar
                    </button>
                  </div>

                  {/* Resumen */}
                  {!isHistorialLoading && historialData && (
                    <div className="px-5 pt-4 flex items-center gap-4 flex-wrap">
                      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5">
                        <p className="text-xs text-slate-500">Ordenes</p>
                        <p className="text-xl font-extrabold text-slate-800">{historialData.length}</p>
                      </div>
                      <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-2.5">
                        <p className="text-xs text-brand-700">Total comprado</p>
                        <p className="text-xl font-extrabold text-brand-700">
                          S/ {historialData.reduce((s, o) => s + Number(o.total), 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tabla */}
                  <div className="p-5 pt-3">
                    {isHistorialLoading ? (
                      <p className="text-sm text-slate-500 py-6 text-center">Cargando historial...</p>
                    ) : (historialData && historialData.length > 0) ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 mt-3">
                        <table className="min-w-[540px] w-full text-sm">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr className="text-left border-b border-slate-200">
                              <th className="py-2.5 px-3 font-semibold">N° Orden</th>
                              <th className="py-2.5 px-3 font-semibold">Fecha</th>
                              <th className="py-2.5 px-3 font-semibold">Metodo</th>
                              <th className="py-2.5 px-3 font-semibold">Estado</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {historialData.map((orden) => {
                              let estadoColor = "bg-slate-100 text-slate-600";
                              if (orden.estado === "PAGADA") estadoColor = "bg-emerald-100 text-emerald-700";
                              else if (orden.estado === "ANULADA") estadoColor = "bg-rose-100 text-rose-700";
                              else if (orden.estado === "DEVUELTA") estadoColor = "bg-amber-100 text-amber-700";
                              return (
                                <tr key={orden.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2.5 px-3 font-mono text-xs text-slate-700">{orden.numero_orden}</td>
                                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                    {new Date(orden.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">{orden.metodo_pago}</td>
                                  <td className="py-2.5 px-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${estadoColor}`}>
                                      {orden.estado}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                                    S/ {Number(orden.total).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 py-8 text-center">No hay compras en este periodo.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "configuracion" && (
              <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto">
              <div className="space-y-4 pb-4">
                {/* Datos de la Empresa */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-bold text-slate-800">Datos de la Empresa</h3>
                    <button
                      type="button"
                      className="btn-primary inline-flex items-center gap-2"
                      onClick={saveEmpresaConfig}
                    >
                      <Save className="w-4 h-4" />
                      Guardar Cambios
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nombre de la Empresa</label>
                      <input className="input-field" value={empresaNombre} onChange={(e) => setEmpresaNombre(e.target.value)} placeholder="Nombre de la empresa" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">RUC</label>
                      <input className="input-field" value={empresaRuc} onChange={(e) => setEmpresaRuc(e.target.value)} placeholder="20123456789" maxLength={11} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Dirección</label>
                      <input className="input-field" value={empresaDireccion} onChange={(e) => setEmpresaDireccion(e.target.value)} placeholder="Av. Principal 123, Lima" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Teléfono</label>
                      <input className="input-field" value={empresaTelefono} onChange={(e) => setEmpresaTelefono(e.target.value)} placeholder="01-234-5678" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email Empresa</label>
                      <input className="input-field" value={empresaEmail} onChange={(e) => setEmpresaEmail(e.target.value)} placeholder="ventas@empresa.com" type="email" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Porcentaje IGV (%)</label>
                      <input className="input-field" value={empresaIgv} onChange={(e) => setEmpresaIgv(e.target.value)} placeholder="18" type="number" min="0" max="100" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Símbolo Moneda</label>
                      <input className="input-field" value={empresaMonedaSimbolo} onChange={(e) => setEmpresaMonedaSimbolo(e.target.value)} placeholder="S/" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nombre Moneda</label>
                      <input className="input-field" value={empresaMonedaNombre} onChange={(e) => setEmpresaMonedaNombre(e.target.value)} placeholder="Soles" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Serie Boleta</label>
                      <input className="input-field" value={empresaSerieBoleta} onChange={(e) => setEmpresaSerieBoleta(e.target.value)} placeholder="B001" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Serie Factura</label>
                      <input className="input-field" value={empresaSerieFactura} onChange={(e) => setEmpresaSerieFactura(e.target.value)} placeholder="F001" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Logo Empresa</label>
                    <div className="flex items-center gap-3">
                      {empresaLogo ? (
                        <img src={empresaLogo} alt="Logo" className="h-14 w-14 rounded-xl object-contain border border-slate-200 bg-slate-50 p-1" />
                      ) : (
                        <div className="h-14 w-14 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 text-2xl">🏪</div>
                      )}
                      <label className="cursor-pointer h-9 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 inline-flex items-center gap-2">
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                        Cambiar Logo
                      </label>
                      {empresaLogo && (
                        <button type="button" className="text-xs text-rose-500 hover:underline" onClick={() => setEmpresaLogo("")}>Quitar logo</button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Datos personales</h3>
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        updateMiPerfil.mutate();
                      }}
                    >
                      <input className="input-field" value={perfilEmail} onChange={(e) => setPerfilEmail(e.target.value)} placeholder="Correo" type="email" required />
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input-field" value={perfilNombre} onChange={(e) => setPerfilNombre(e.target.value)} placeholder="Nombre" />
                        <input className="input-field" value={perfilApellido} onChange={(e) => setPerfilApellido(e.target.value)} placeholder="Apellido" />
                      </div>
                      <input className="input-field" value={perfilTelefono} onChange={(e) => setPerfilTelefono(e.target.value)} placeholder="Telefono" />
                      <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={updateMiPerfil.isPending}>
                        <Save className="w-4 h-4" />
                        {updateMiPerfil.isPending ? "Guardando..." : "Guardar perfil"}
                      </button>
                    </form>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Seguridad</h3>
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        updateMiPassword.mutate();
                      }}
                    >
                      <input
                        className="input-field"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Contrasena actual"
                        type="password"
                        required
                      />
                      <input
                        className="input-field"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nueva contrasena"
                        type="password"
                        required
                      />
                      <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={updateMiPassword.isPending}>
                        <KeyRound className="w-4 h-4" />
                        {updateMiPassword.isPending ? "Actualizando..." : "Cambiar contrasena"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              </div>
            )}

            {activeSection === "ventas" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm xl:flex-1 xl:min-h-0 xl:flex xl:flex-col xl:overflow-hidden">
                <div className="shrink-0 p-4 xl:border-b xl:border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <input className="input-field" placeholder="Buscar cliente o email" value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)} />
                  <input className="input-field" type="date" value={desdeFiltro} onChange={(e) => setDesdeFiltro(e.target.value)} />
                  <input className="input-field" type="date" value={hastaFiltro} onChange={(e) => setHastaFiltro(e.target.value)} />
                  <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => { setClienteFiltro(""); setDesdeFiltro(""); setHastaFiltro(""); }}>
                    <FilterX className="w-4 h-4" />
                    Limpiar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500 uppercase">Total ventas</p>
                    <p className="text-3xl font-extrabold text-violet-700">{formatCurrency(orders.reduce((acc, o) => acc + Number(o.total), 0))}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500 uppercase">Numero de ventas</p>
                    <p className="text-3xl font-extrabold text-slate-800">{orders.length}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500 uppercase">Ticket promedio</p>
                    <p className="text-3xl font-extrabold text-emerald-700">{formatCurrency(orders.length ? orders.reduce((acc, o) => acc + Number(o.total), 0) / orders.length : 0)}</p>
                  </div>
                </div>
                </div>
                <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto">
                <div className="overflow-x-auto p-4 pt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2">Comprobante</th>
                      <th className="py-2">Cliente</th>
                      <th className="py-2">Estado</th>
                      <th className="py-2">Pago</th>
                      <th className="py-2">Transaccion</th>
                      <th className="py-2">Total</th>
                      <th className="py-2">Fecha</th>
                      <th className="py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-100">
                        <td className="py-2 font-semibold">{order.numero_orden}</td>
                        <td className="py-2">{order.cliente ? `${order.cliente.nombre} ${order.cliente.apellido}` : `Cliente #${order.cliente_id}`}</td>
                        <td className="py-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusStyles(order.estado)}`}>
                            {order.estado}
                          </span>
                        </td>
                        <td className="py-2">{order.metodo_pago}</td>
                        <td className="py-2">{order.transaccion_id || "-"}</td>
                        <td className="py-2 font-bold">{formatCurrency(Number(order.total))}</td>
                        <td className="py-2">{formatDateTime(order.created_at)}</td>
                        <td className="py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center"
                              title="Ver detalle"
                              onClick={() => openOrderDetail(order.id)}
                              disabled={isOrderDetailLoading}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center"
                              title="Ver comprobante"
                              onClick={() => downloadOrderDetail(order)}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Anular venta"
                              onClick={() => requestCancelOrder(order)}
                              disabled={isOrderClosed(order.estado) || cancelOrderMutation.isPending}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Registrar devolución"
                              onClick={() => setDevolucionTarget(order)}
                              disabled={isOrderClosed(order.estado) || devolucionMutation.isPending}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!orders.length && <p className="text-sm text-slate-500 mt-3">No hay ventas para los filtros seleccionados.</p>}
                </div>
                </div>
              </div>
            )}

            {isOrderModalOpen && orderDetail && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <button
                  type="button"
                  aria-label="Cerrar detalle"
                  className="absolute inset-0 bg-slate-900/40"
                  onClick={() => setIsOrderModalOpen(false)}
                />
                <div className="relative w-full max-w-5xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-3">
                    <h3 className="text-3xl font-extrabold text-slate-800">Detalle Venta - {orderDetail.numero_orden}</h3>
                    <button type="button" className="h-10 w-10 rounded-full text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center" onClick={() => setIsOrderModalOpen(false)}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
                      <div>
                        <p className="text-slate-400 text-sm">Cliente</p>
                        <p className="font-bold text-2xl text-slate-800">{orderDetail.cliente ? `${orderDetail.cliente.nombre} ${orderDetail.cliente.apellido}` : `Cliente #${orderDetail.cliente_id}`}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Fecha</p>
                        <p className="font-bold text-2xl text-slate-800">{formatDateTime(orderDetail.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Tipo Pago</p>
                        <p className="font-semibold text-2xl text-slate-800">{orderDetail.metodo_pago}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Estado</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusStyles(orderDetail.estado)}`}>
                          {orderDetail.estado}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500 bg-slate-50">
                            <th className="py-3 px-4 uppercase tracking-wide">Producto</th>
                            <th className="py-3 px-4 uppercase tracking-wide">Cantidad</th>
                            <th className="py-3 px-4 uppercase tracking-wide">Precio Un.</th>
                            <th className="py-3 px-4 uppercase tracking-wide">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderDetail.items.map((item) => (
                            <tr key={item.id} className="border-t border-slate-100">
                              <td className="py-3 px-4 text-lg text-slate-800">{item.producto.nombre}</td>
                              <td className="py-3 px-4 text-lg text-slate-800">{item.cantidad}</td>
                              <td className="py-3 px-4 text-lg text-slate-800">{formatCurrency(Number(item.precio_unitario))}</td>
                              <td className="py-3 px-4 text-lg font-bold text-slate-900">{formatCurrency(Number(item.total_linea))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col items-end text-right gap-1">
                      <p className="text-slate-500">IGV (18%): {formatCurrency(Number(orderDetail.impuestos))}</p>
                      <p className="text-5xl font-black text-indigo-950">TOTAL: {formatCurrency(Number(orderDetail.total))}</p>
                    </div>
                  </div>

                  <div className="px-6 py-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <button
                      type="button"
                      className="h-11 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-100 inline-flex items-center gap-2"
                      onClick={() => requestCancelOrder(orderDetail)}
                      disabled={isOrderClosed(orderDetail.estado) || cancelOrderMutation.isPending}
                    >
                      <Ban className="w-4 h-4" />
                      Anular Venta
                    </button>
                    <button
                      type="button"
                      className="h-11 px-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 inline-flex items-center gap-2"
                      onClick={() => setDevolucionTarget(orderDetail)}
                      disabled={isOrderClosed(orderDetail.estado) || devolucionMutation.isPending}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Registrar Devolución
                    </button>
                    <button
                      type="button"
                      className="h-11 px-4 rounded-xl bg-fuchsia-600 text-white text-sm font-semibold hover:bg-fuchsia-700 inline-flex items-center gap-2"
                      onClick={() => openReceiptWindow(orderDetail, true)}
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir Comprobante
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "devoluciones" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm xl:flex-1 xl:min-h-0 xl:flex xl:flex-col xl:overflow-hidden">
                <div className="shrink-0 px-4 pt-4 pb-3 xl:border-b xl:border-slate-100 flex items-center gap-2">
                  <RotateCcw className="w-6 h-6 text-amber-600" />
                  <h3 className="text-3xl font-extrabold text-slate-800">Devoluciones registradas</h3>
                </div>
                <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto p-4">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b bg-slate-50">
                      <th className="py-3 px-2 uppercase tracking-wide">Orden original</th>
                      <th className="py-3 px-2 uppercase tracking-wide">Cliente</th>
                      <th className="py-3 px-2 uppercase tracking-wide">Método pago</th>
                      <th className="py-3 px-2 uppercase tracking-wide">Total devuelto</th>
                      <th className="py-3 px-2 uppercase tracking-wide">Fecha venta</th>
                      <th className="py-3 px-2 uppercase tracking-wide text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devolucionesData.map((order) => (
                      <tr key={`dev-${order.id}`} className="border-b border-slate-100">
                        <td className="py-3 px-2 font-semibold">{order.numero_orden}</td>
                        <td className="py-3 px-2">{order.cliente ? `${order.cliente.nombre} ${order.cliente.apellido}` : `Cliente #${order.cliente_id}`}</td>
                        <td className="py-3 px-2">{order.metodo_pago}</td>
                        <td className="py-3 px-2 font-bold text-amber-700">{formatCurrency(Number(order.total))}</td>
                        <td className="py-3 px-2">{formatDateTime(order.created_at)}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center"
                              title="Ver detalle"
                              onClick={() => openOrderDetail(order.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center"
                              title="Comprobante"
                              onClick={() => downloadOrderDetail(order)}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!devolucionesData.length && (
                  <p className="text-2xl text-slate-400 py-8 text-center">No hay devoluciones registradas</p>
                )}
                </div>
                </div>
              </div>
            )}

            {activeSection === "reportes" && (
              <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto">
                <div className="space-y-4 pb-4">

                  {/* Filtro periodo + descripción */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-lg">Centro de Reportes</h3>
                        <p className="text-sm text-slate-500">Descarga informes completos en PDF o Excel para gestionar tu empresa</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label htmlFor="rpt-periodo" className="text-xs font-medium text-slate-500">Periodo:</label>
                        <select
                          id="rpt-periodo"
                          value={graficoPeriodo}
                          onChange={(e) => setGraficoPeriodo(e.target.value as Periodo)}
                          className="rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                        >
                          {PERIODOS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Informes ejecutivos generados por el backend */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Informe Ejecutivo */}
                    <div className="bg-gradient-to-br from-violet-700 to-violet-500 rounded-2xl p-5 text-white shadow-sm flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-lg leading-tight">Informe Ejecutivo</h4>
                          <p className="text-violet-100 text-sm mt-0.5">KPIs, analisis de ventas y narrativa ejecutiva para direccion</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/15 rounded-xl px-2 py-2.5">
                          <p className="text-xl font-extrabold">{kpiData?.totalOrdenes ?? 0}</p>
                          <p className="text-xs text-violet-100">Ordenes</p>
                        </div>
                        <div className="bg-white/15 rounded-xl px-2 py-2.5">
                          <p className="text-sm font-extrabold truncate">{formatCurrency(Number(kpiData?.ventasTotales ?? 0))}</p>
                          <p className="text-xs text-violet-100">Ventas</p>
                        </div>
                        <div className="bg-white/15 rounded-xl px-2 py-2.5">
                          <p className="text-sm font-extrabold truncate">{formatCurrency(Number(kpiData?.ticketPromedio ?? 0))}</p>
                          <p className="text-xs text-violet-100">Ticket</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isDownloadingPdf === "informe-ejecutivo.pdf"}
                        onClick={() => void downloadBackendPdf("/reportes/gestion", "informe-ejecutivo.pdf")}
                        className="w-full flex items-center justify-center gap-2 bg-white text-violet-700 font-bold rounded-xl py-2.5 hover:bg-violet-50 transition disabled:opacity-70 text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        {isDownloadingPdf === "informe-ejecutivo.pdf" ? "Generando PDF..." : "Descargar PDF Ejecutivo"}
                      </button>
                    </div>

                    {/* Informe Operacional */}
                    <div className="bg-gradient-to-br from-sky-700 to-sky-500 rounded-2xl p-5 text-white shadow-sm flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-lg leading-tight">Informe Operacional</h4>
                          <p className="text-sky-100 text-sm mt-0.5">Detalle operativo de ventas, stock critico y metricas del negocio</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/15 rounded-xl px-2 py-2.5">
                          <p className="text-xl font-extrabold">{products.length}</p>
                          <p className="text-xs text-sky-100">Productos</p>
                        </div>
                        <div className="bg-white/15 rounded-xl px-2 py-2.5">
                          <p className="text-xl font-extrabold">{stockBajo.length}</p>
                          <p className="text-xs text-sky-100">Stock critico</p>
                        </div>
                        <div className="bg-white/15 rounded-xl px-2 py-2.5">
                          <p className="text-xl font-extrabold">{clientes.filter((u) => u.activo).length}</p>
                          <p className="text-xs text-sky-100">Clientes</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isDownloadingPdf === "informe-operacional.pdf"}
                        onClick={() => void downloadBackendPdf("/reportes/operacional", "informe-operacional.pdf")}
                        className="w-full flex items-center justify-center gap-2 bg-white text-sky-700 font-bold rounded-xl py-2.5 hover:bg-sky-50 transition disabled:opacity-70 text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        {isDownloadingPdf === "informe-operacional.pdf" ? "Generando PDF..." : "Descargar PDF Operacional"}
                      </button>
                    </div>
                  </div>

                  {/* Reportes de datos exportables */}
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-1">Reportes de datos — PDF y Excel</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                    {/* Ventas */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 leading-tight">Ventas</h4>
                          <p className="text-xs text-slate-500">{PERIODOS.find((p) => p.value === graficoPeriodo)?.label ?? "Historico"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-lg font-extrabold text-slate-800">{filtrarPorPeriodo(allOrders, graficoPeriodo).length}</p>
                          <p className="text-xs text-slate-500">Ordenes</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-sm font-extrabold text-emerald-700 truncate">{formatCurrency(filtrarPorPeriodo(allOrders, graficoPeriodo).reduce((s, o) => s + Number(o.total), 0))}</p>
                          <p className="text-xs text-slate-500">Facturado</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-slate-800 text-white rounded-xl py-2 text-xs font-bold hover:bg-slate-700 transition"
                          onClick={() =>
                            printTableReport(
                              `Reporte de Ventas — ${PERIODOS.find((p) => p.value === graficoPeriodo)?.label ?? ""}`,
                              ["Orden", "Cliente", "Estado", "Pago", "Subtotal", "IGV", "Total", "Fecha"],
                              filtrarPorPeriodo(allOrders, graficoPeriodo).map((o) => [
                                o.numero_orden,
                                o.cliente ? `${o.cliente.nombre} ${o.cliente.apellido}` : `#${o.cliente_id}`,
                                o.estado,
                                o.metodo_pago,
                                `S/ ${Number(o.subtotal).toFixed(2)}`,
                                `S/ ${Number(o.impuestos).toFixed(2)}`,
                                `S/ ${Number(o.total).toFixed(2)}`,
                                formatDateTime(o.created_at)
                              ])
                            )
                          }
                        >
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white rounded-xl py-2 text-xs font-bold hover:bg-emerald-700 transition"
                          onClick={() =>
                            downloadExcel(
                              `reporte-ventas-${graficoPeriodo}`,
                              ["Orden", "Cliente", "Email", "Estado", "Metodo Pago", "Transaccion", "Subtotal", "IGV", "Total", "Fecha"],
                              filtrarPorPeriodo(allOrders, graficoPeriodo).map((o) => [
                                o.numero_orden,
                                o.cliente ? `${o.cliente.nombre} ${o.cliente.apellido}` : `Cliente #${o.cliente_id}`,
                                o.cliente?.email ?? "",
                                o.estado,
                                o.metodo_pago,
                                o.transaccion_id ?? "",
                                Number(o.subtotal).toFixed(2),
                                Number(o.impuestos).toFixed(2),
                                Number(o.total).toFixed(2),
                                formatDateTime(o.created_at)
                              ])
                            )
                          }
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                        </button>
                      </div>
                    </div>

                    {/* Inventario */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 leading-tight">Inventario</h4>
                          <p className="text-xs text-slate-500">Stock actual por producto</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-lg font-extrabold text-slate-800">{inventory.length}</p>
                          <p className="text-xs text-slate-500">Productos</p>
                        </div>
                        <div className="bg-rose-50 rounded-xl p-2.5 text-center">
                          <p className="text-lg font-extrabold text-rose-600">{stockBajo.length}</p>
                          <p className="text-xs text-rose-500">Stock critico</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-slate-800 text-white rounded-xl py-2 text-xs font-bold hover:bg-slate-700 transition"
                          onClick={() =>
                            printTableReport(
                              "Reporte de Inventario",
                              ["Producto", "Categoria", "Stock Actual", "Reservado", "Disponible", "Minimo", "Estado"],
                              inventory.map((item) => {
                                const critico = Number(item.stock_disponible) <= Number(item.producto.stock_minimo);
                                const agotado = Number(item.stock_disponible) === 0;
                                let estado: string;
                                if (agotado) { estado = "AGOTADO"; }
                                else if (critico) { estado = "CRITICO"; }
                                else { estado = "NORMAL"; }
                                return [
                                  item.producto.nombre,
                                  item.producto.categoria,
                                  item.stock_actual,
                                  item.stock_reservado,
                                  item.stock_disponible,
                                  item.producto.stock_minimo,
                                  estado
                                ];
                              })
                            )
                          }
                        >
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-amber-600 text-white rounded-xl py-2 text-xs font-bold hover:bg-amber-700 transition"
                          onClick={() =>
                            downloadExcel(
                              "reporte-inventario",
                              ["Producto", "Categoria", "Stock Actual", "Stock Reservado", "Stock Disponible", "Stock Minimo", "Estado"],
                              inventory.map((item) => {
                                const critico = Number(item.stock_disponible) <= Number(item.producto.stock_minimo);
                                const agotado = Number(item.stock_disponible) === 0;
                                let estadoCsv: string;
                                if (agotado) { estadoCsv = "AGOTADO"; }
                                else if (critico) { estadoCsv = "CRITICO"; }
                                else { estadoCsv = "NORMAL"; }
                                return [
                                  item.producto.nombre,
                                  item.producto.categoria,
                                  item.stock_actual,
                                  item.stock_reservado,
                                  item.stock_disponible,
                                  item.producto.stock_minimo,
                                  estadoCsv
                                ];
                              })
                            )
                          }
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                        </button>
                      </div>
                    </div>

                    {/* Catalogo de Productos */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                          <BarChart2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 leading-tight">Catalogo de Productos</h4>
                          <p className="text-xs text-slate-500">SKU, precios y estado de cada item</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-lg font-extrabold text-slate-800">{products.filter((p) => p.activo).length}</p>
                          <p className="text-xs text-slate-500">Activos</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-lg font-extrabold text-violet-700">{new Set(products.map((p) => p.categoria)).size}</p>
                          <p className="text-xs text-slate-500">Categorias</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-slate-800 text-white rounded-xl py-2 text-xs font-bold hover:bg-slate-700 transition"
                          onClick={() =>
                            printTableReport(
                              "Catalogo de Productos",
                              ["SKU", "Nombre", "Categoria", "Precio", "Stock", "Estado"],
                              products.map((p) => [
                                p.sku,
                                p.nombre,
                                p.categoria,
                                `S/ ${Number(p.precio).toFixed(2)}`,
                                Number(p.inventario?.stock_disponible ?? 0),
                                p.activo ? "ACTIVO" : "INACTIVO"
                              ])
                            )
                          }
                        >
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-violet-600 text-white rounded-xl py-2 text-xs font-bold hover:bg-violet-700 transition"
                          onClick={() =>
                            downloadExcel(
                              "catalogo-productos",
                              ["SKU", "Nombre", "Descripcion", "Categoria", "Precio", "Stock Disponible", "Stock Minimo", "Estado"],
                              products.map((p) => [
                                p.sku,
                                p.nombre,
                                p.descripcion ?? "",
                                p.categoria,
                                Number(p.precio).toFixed(2),
                                Number(p.inventario?.stock_disponible ?? 0),
                                p.stock_minimo,
                                p.activo ? "ACTIVO" : "INACTIVO"
                              ])
                            )
                          }
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                        </button>
                      </div>
                    </div>

                    {/* Clientes */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 leading-tight">Clientes</h4>
                          <p className="text-xs text-slate-500">Base de datos de clientes registrados</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-lg font-extrabold text-slate-800">{clientes.filter((u) => u.activo).length}</p>
                          <p className="text-xs text-slate-500">Activos</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-lg font-extrabold text-slate-800">{clientes.length}</p>
                          <p className="text-xs text-slate-500">Total</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-slate-800 text-white rounded-xl py-2 text-xs font-bold hover:bg-slate-700 transition"
                          onClick={() =>
                            printTableReport(
                              "Reporte de Clientes",
                              ["Nombre", "Apellido", "Email", "Telefono", "Estado", "Registro"],
                              clientes.map((u) => [
                                u.cliente?.nombre ?? "",
                                u.cliente?.apellido ?? "",
                                u.email,
                                u.cliente?.telefono ?? "",
                                u.activo ? "ACTIVO" : "INACTIVO",
                                formatDateTime(u.created_at)
                              ])
                            )
                          }
                        >
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-blue-600 text-white rounded-xl py-2 text-xs font-bold hover:bg-blue-700 transition"
                          onClick={() =>
                            downloadExcel(
                              "reporte-clientes",
                              ["Nombre", "Apellido", "Email", "Telefono", "Estado", "Fecha Registro"],
                              clientes.map((u) => [
                                u.cliente?.nombre ?? "",
                                u.cliente?.apellido ?? "",
                                u.email,
                                u.cliente?.telefono ?? "",
                                u.activo ? "ACTIVO" : "INACTIVO",
                                formatDateTime(u.created_at)
                              ])
                            )
                          }
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                        </button>
                      </div>
                    </div>

                    {/* Devoluciones */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                          <RotateCcw className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 leading-tight">Devoluciones</h4>
                          <p className="text-xs text-slate-500">Ordenes devueltas con importe revertido</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-lg font-extrabold text-rose-600">{filtrarPorPeriodo(devolucionesData, graficoPeriodo).length}</p>
                          <p className="text-xs text-slate-500">Devoluciones</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-sm font-extrabold text-rose-600 truncate">{formatCurrency(filtrarPorPeriodo(devolucionesData, graficoPeriodo).reduce((s, o) => s + Number(o.total), 0))}</p>
                          <p className="text-xs text-slate-500">Total</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-slate-800 text-white rounded-xl py-2 text-xs font-bold hover:bg-slate-700 transition"
                          onClick={() =>
                            printTableReport(
                              `Reporte de Devoluciones — ${PERIODOS.find((p) => p.value === graficoPeriodo)?.label ?? ""}`,
                              ["Orden", "Cliente", "Metodo Pago", "Total Devuelto", "Fecha"],
                              filtrarPorPeriodo(devolucionesData, graficoPeriodo).map((o) => [
                                o.numero_orden,
                                o.cliente ? `${o.cliente.nombre} ${o.cliente.apellido}` : `#${o.cliente_id}`,
                                o.metodo_pago,
                                `S/ ${Number(o.total).toFixed(2)}`,
                                formatDateTime(o.created_at)
                              ])
                            )
                          }
                        >
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-rose-600 text-white rounded-xl py-2 text-xs font-bold hover:bg-rose-700 transition"
                          onClick={() =>
                            downloadExcel(
                              `reporte-devoluciones-${graficoPeriodo}`,
                              ["Orden", "Cliente", "Email", "Metodo Pago", "Subtotal", "IGV", "Total Devuelto", "Fecha"],
                              filtrarPorPeriodo(devolucionesData, graficoPeriodo).map((o) => [
                                o.numero_orden,
                                o.cliente ? `${o.cliente.nombre} ${o.cliente.apellido}` : `Cliente #${o.cliente_id}`,
                                o.cliente?.email ?? "",
                                o.metodo_pago,
                                Number(o.subtotal).toFixed(2),
                                Number(o.impuestos).toFixed(2),
                                Number(o.total).toFixed(2),
                                formatDateTime(o.created_at)
                              ])
                            )
                          }
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                        </button>
                      </div>
                    </div>

                    {/* Resumen por Categoria */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center shrink-0">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 leading-tight">Ventas por Categoria</h4>
                          <p className="text-xs text-slate-500">Ingresos y unidades agrupados por categoria</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-lg font-extrabold text-slate-800">{graficosData?.ventasPorCategoria.length ?? 0}</p>
                          <p className="text-xs text-slate-500">Categorias</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-sm font-extrabold text-fuchsia-700 truncate">
                            {formatCurrency((graficosData?.ventasPorCategoria ?? []).reduce((s, c) => s + c.ingresos, 0))}
                          </p>
                          <p className="text-xs text-slate-500">Total</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-slate-800 text-white rounded-xl py-2 text-xs font-bold hover:bg-slate-700 transition"
                          onClick={() =>
                            printTableReport(
                              "Ventas por Categoria",
                              ["Categoria", "Ingresos (S/)", "Unidades Vendidas"],
                              (graficosData?.ventasPorCategoria ?? []).map((c) => [
                                c.categoria,
                                `S/ ${c.ingresos.toFixed(2)}`,
                                c.unidades
                              ])
                            )
                          }
                        >
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 bg-fuchsia-600 text-white rounded-xl py-2 text-xs font-bold hover:bg-fuchsia-700 transition"
                          onClick={() =>
                            downloadExcel(
                              `ventas-por-categoria-${graficoPeriodo}`,
                              ["Categoria", "Ingresos", "Unidades Vendidas"],
                              (graficosData?.ventasPorCategoria ?? []).map((c) => [
                                c.categoria,
                                c.ingresos.toFixed(2),
                                c.unidades
                              ])
                            )
                          }
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {cancelOrderTarget && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                <button
                  type="button"
                  aria-label="Cerrar confirmacion"
                  className="absolute inset-0 bg-slate-900/45"
                  onClick={() => setCancelOrderTarget(null)}
                />
                <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="p-8 text-center">
                    <div className="mx-auto h-24 w-24 rounded-full bg-rose-100 text-rose-600 inline-flex items-center justify-center mb-5">
                      <Trash2 className="w-11 h-11" />
                    </div>
                    <h3 className="text-4xl font-black text-indigo-950">Anular venta?</h3>
                    <p className="text-slate-500 mt-3 text-2xl leading-snug">
                      Se revertira el stock de los productos vendidos. Esta accion no se puede deshacer.
                    </p>
                  </div>
                  <div className="border-t border-slate-200 p-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      className="h-11 px-5 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-semibold hover:bg-violet-100"
                      onClick={() => setCancelOrderTarget(null)}
                      disabled={cancelOrderMutation.isPending}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="h-11 px-5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold hover:bg-rose-100"
                      onClick={executeCancelOrder}
                      disabled={cancelOrderMutation.isPending}
                    >
                      {cancelOrderMutation.isPending ? "Anulando..." : "Anular Venta"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {devolucionTarget && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                <button
                  type="button"
                  aria-label="Cerrar confirmacion"
                  className="absolute inset-0 bg-slate-900/45"
                  onClick={() => setDevolucionTarget(null)}
                />
                <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="p-8 text-center">
                    <div className="mx-auto h-24 w-24 rounded-full bg-amber-100 text-amber-600 inline-flex items-center justify-center mb-5">
                      <RotateCcw className="w-11 h-11" />
                    </div>
                    <h3 className="text-4xl font-black text-indigo-950">Registrar devolución?</h3>
                    <p className="text-xl font-semibold text-slate-700 mt-2">{devolucionTarget.numero_orden}</p>
                    <p className="text-slate-500 mt-3 text-2xl leading-snug">
                      El cliente devuelve los productos. El stock será repuesto y la orden quedará en estado DEVUELTA. Esta acción no se puede deshacer.
                    </p>
                  </div>
                  <div className="border-t border-slate-200 p-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      className="h-11 px-5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                      onClick={() => setDevolucionTarget(null)}
                      disabled={devolucionMutation.isPending}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="h-11 px-5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100"
                      onClick={() => devolucionMutation.mutate(devolucionTarget.id)}
                      disabled={devolucionMutation.isPending}
                    >
                      {devolucionMutation.isPending ? "Registrando..." : "Confirmar Devolución"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <ProductModal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                setModalProduct(null);
              }}
              product={modalProduct}
              createMutation={createProduct}
              updateMutation={updateProduct}
            />

            <ClientCredentialsModal
              isOpen={isClientModalOpen}
              onClose={() => {
                setIsClientModalOpen(false);
                setSelectedClient(null);
              }}
              cliente={selectedClient}
              mutation={updateCredencialesCliente}
            />
          </main>
        </div>
      </div>
    </div>
  );
};
