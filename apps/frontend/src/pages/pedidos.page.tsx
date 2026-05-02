import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Box,
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Package,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";
import { apiClient } from "../services/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────
type OrdenItem = {
  id: number;
  cantidad: number;
  precio_unitario: number;
  total_linea: number;
  producto: {
    id: number;
    nombre: string;
    imagen_url?: string | null;
    categoria: string;
  };
};

type Orden = {
  id: number;
  numero_orden: string;
  total: number;
  subtotal: number;
  impuestos: number;
  estado: string;
  metodo_pago: string;
  transaccion_id?: string | null;
  created_at: string;
  items: OrdenItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMoney = (v: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

const formatDate = (v: string) =>
  new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));

const estadoBadge: Record<string, { bg: string; text: string; label: string }> = {
  PAGADA:     { bg: "bg-emerald-100", text: "text-emerald-700", label: "Pagada" },
  PENDIENTE:  { bg: "bg-amber-100",   text: "text-amber-700",   label: "Pendiente" },
  PROCESANDO: { bg: "bg-blue-100",    text: "text-blue-700",    label: "Procesando" },
  ENVIADA:    { bg: "bg-indigo-100",  text: "text-indigo-700",  label: "Enviada" },
  ENTREGADA:  { bg: "bg-teal-100",    text: "text-teal-700",    label: "Entregada" },
  CANCELADA:  { bg: "bg-red-100",     text: "text-red-700",     label: "Cancelada" },
  DEVUELTA:   { bg: "bg-slate-100",   text: "text-slate-600",   label: "Devuelta" },
};

const metodoPagoLabel: Record<string, string> = {
  TARJETA:       "Tarjeta",
  YAPE:          "Yape",
  IZIPAY:        "Izipay",
  TRANSFERENCIA: "Transferencia",
  PLIN:          "Plin",
};

// ─── Component ────────────────────────────────────────────────────────────────
export const PedidosPage = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: ordenes = [], isLoading } = useQuery({
    queryKey: ["mis-pedidos"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Orden[] }>("/ordenes/mine");
      return res.data.data;
    },
  });

  const toggle = (id: number) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-brand-700" />
                Mis Pedidos
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">Historial de todas tus compras</p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Cargando tus pedidos...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && ordenes.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Box className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700">No tienes pedidos aún</p>
              <p className="text-sm text-slate-400 mt-1">Tus compras aparecerán aquí una vez que realices tu primer pedido.</p>
            </div>
            <Link
              to="/"
              className="mt-2 inline-flex items-center gap-2 bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-800 transition-colors shadow-sm"
            >
              <Package className="w-4 h-4" />
              Ver productos
            </Link>
          </div>
        )}

        {/* Order list */}
        {!isLoading && ordenes.length > 0 && (
          <div className="space-y-3">
            {ordenes.map((orden) => {
              const badge = estadoBadge[orden.estado] ?? { bg: "bg-slate-100", text: "text-slate-600", label: orden.estado };
              const isOpen = expandedId === orden.id;

              return (
                <div
                  key={orden.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Order header row */}
                  <button
                    type="button"
                    onClick={() => toggle(orden.id)}
                    className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <ReceiptText className="w-5 h-5 text-brand-700" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">{orden.numero_orden}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(orden.created_at)}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {metodoPagoLabel[orden.metodo_pago] ?? orden.metodo_pago}
                        </span>
                        <span className="text-xs text-slate-400">
                          {orden.items.length} {orden.items.length === 1 ? "producto" : "productos"}
                        </span>
                      </div>
                    </div>

                    {/* Total + chevron */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-base font-extrabold text-slate-800">{formatMoney(orden.total)}</span>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                      }
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">

                      {/* Items */}
                      <div className="space-y-3">
                        {orden.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            {item.producto.imagen_url ? (
                              <img
                                src={item.producto.imagen_url}
                                alt={item.producto.nombre}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-100 flex-shrink-0 bg-slate-50"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <Package className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{item.producto.nombre}</p>
                              <p className="text-xs text-slate-400">{item.producto.categoria}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-slate-800">{formatMoney(item.total_linea)}</p>
                              <p className="text-xs text-slate-400">{item.cantidad} × {formatMoney(item.precio_unitario)}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Totals */}
                      <div className="border-t border-slate-100 pt-3 space-y-1.5">
                        <div className="flex justify-between text-sm text-slate-500">
                          <span>Subtotal</span>
                          <span>{formatMoney(orden.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-500">
                          <span>IGV (18%)</span>
                          <span>{formatMoney(orden.impuestos)}</span>
                        </div>
                        <div className="flex justify-between text-base font-extrabold text-slate-800 pt-1 border-t border-slate-100">
                          <span>Total</span>
                          <span>{formatMoney(orden.total)}</span>
                        </div>
                      </div>

                      {/* Transaction ID */}
                      {orden.transaccion_id && (
                        <p className="text-xs text-slate-400 font-mono bg-slate-50 rounded-lg px-3 py-2">
                          Transacción: {orden.transaccion_id}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
