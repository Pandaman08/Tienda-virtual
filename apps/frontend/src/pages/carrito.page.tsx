import { useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Lock,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import { apiClient } from "../services/api-client";
import { useCartStore } from "../stores/cart.store";
import { useAuthStore } from "../stores/auth.store";
// ─── Types ────────────────────────────────────────────────────────────────────
type CheckoutStep = "shipping" | "payment" | "processing" | "success";
type ShippingSubStep = "form" | "method";
type MetodoPago = "TARJETA" | "IZIPAY" | "YAPE";
type MarcaTarjeta = "VISA" | "MASTERCARD" | "AMEX";
type EnvioMetodo = "RETIRO" | "DOMICILIO";

const TEST_CARD: Record<MarcaTarjeta, { numero: string; caducidad: string; cvv: string; nombre: string; apellido: string }> = {
  VISA:       { numero: "4111 1111 1111 1111", caducidad: "12/29", cvv: "123",  nombre: "Juan",  apellido: "Perez"  },
  MASTERCARD: { numero: "5555 5555 5555 4444", caducidad: "11/28", cvv: "321",  nombre: "Ana",   apellido: "Garcia" },
  AMEX:       { numero: "3782 822463 10005",   caducidad: "10/30", cvv: "4567", nombre: "Luis",  apellido: "Ramos"  },
};

const igvRate = 0.18;
const envioPrice = 18.5;
const orderId = Date.now().toString().slice(-8);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const formatCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

// ─── Component ────────────────────────────────────────────────────────────────
export const CarritoPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { items, remove, increment, decrement, clear } = useCartStore();
  const { accessToken, email } = useAuthStore();
  const isLoggedIn = !!accessToken;

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.precio * i.cantidad, 0), [items]);
  const igv      = useMemo(() => subtotal * igvRate, [subtotal]);

  const [step, setStep]                       = useState<CheckoutStep>("shipping");
  const [shippingSubStep, setShippingSubStep] = useState<ShippingSubStep>("form");
  const [envioMetodo, setEnvioMetodo]         = useState<EnvioMetodo>("RETIRO");
  const [guestEmail, setGuestEmail]           = useState("");
  const [nombre,     setNombre]     = useState("Juan");
  const [apellidos,  setApellidos]  = useState("Perez");
  const [tipoDoc,    setTipoDoc]    = useState("DNI");
  const [documento,  setDocumento]  = useState("12345678");
  const [telefono,   setTelefono]   = useState("900000000");
  const [calle,      setCalle]      = useState("Av. Larco");
  const [numero,     setNumero]     = useState("150");
  const [piso,       setPiso]       = useState("");
  const [ciudad,     setCiudad]     = useState("Trujillo");
  const [estado,     setEstado]     = useState("La Libertad");
  const [cp,         setCp]         = useState("13001");
  const [metodoPago,  setMetodoPago]  = useState<MetodoPago>("TARJETA");
  const [marcaTarjeta, setMarcaTarjeta] = useState<MarcaTarjeta>("VISA");
  const [cardNum,     setCardNum]     = useState("");
  const [cardCad,     setCardCad]     = useState("");
  const [cardCvv,     setCardCvv]     = useState("");
  const [cardNombre,  setCardNombre]  = useState("");
  const [cardApellido,setCardApellido]= useState("");
  const [cardEmail,   setCardEmail]   = useState(email ?? "");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");

  type OrderSnapshot = { items: typeof items; subtotal: number; igv: number; envioTotal: number; total: number; cliente: string; correo: string };
  const paidSnapshot = useRef<OrderSnapshot | null>(null);

  const envioTotal = envioMetodo === "DOMICILIO" ? envioPrice : 0;
  const total      = subtotal + igv + envioTotal;

  const applyTestCard = () => {
    const d = TEST_CARD[marcaTarjeta];
    setCardNum(d.numero); setCardCad(d.caducidad); setCardCvv(d.cvv);
    setCardNombre(d.nombre); setCardApellido(d.apellido);
    setCardEmail(email ?? "juan.perez@example.com");
  };

  const handleGuestContinue = () => {
    if (!guestEmail.includes("@")) { toast.error("Ingresa un correo valido"); return; }
    setShippingSubStep("form");
  };

  const handleShippingFormContinue = () => {
    if (!nombre || !apellidos || !documento || !telefono || !calle) {
      toast.error("Completa los campos obligatorios"); return;
    }
    setShippingSubStep("method");
  };

  const handlePay = async () => {
    if (!aceptaTerminos) { toast.error("Debes aceptar los terminos y condiciones"); return; }

    // Validacion de campos de tarjeta antes de llamar al API
    if (metodoPago === "TARJETA") {
      const rawNum = cardNum.replace(/\s/g, "");
      if (rawNum.length < 12) { toast.error("Numero de tarjeta invalido"); return; }
      if (!cardCad) { toast.error("Ingresa la fecha de caducidad"); return; }
      if (!cardCvv) { toast.error("Ingresa el CVV"); return; }
      if (!cardNombre || !cardApellido) { toast.error("Ingresa el nombre del titular"); return; }
    }

    setStep("processing");
    try {
      // 1. Sync cart to backend (one call per item)
      setProcessingMsg("Verificando carrito...");
      await apiClient.delete("/carrito/clear");
      for (const item of items) {
        await apiClient.post("/carrito/items", { productoId: item.id, cantidad: item.cantidad });
      }
      await wait(800);

      // 2. Map frontend metodo to backend enum
      type BackendMetodo = "TARJETA" | "YAPE" | "PLIN" | "TRANSFERENCIA";
      const metodoMap: Record<string, BackendMetodo> = {
        TARJETA: "TARJETA",
        YAPE: "YAPE",
        IZIPAY: "TRANSFERENCIA",
      };
      const backendMetodo: BackendMetodo = metodoMap[metodoPago] ?? "TARJETA";

      setProcessingMsg("Procesando pago...");
      await wait(1000);
      setProcessingMsg("Confirmando orden...");
      await apiClient.post("/ordenes/checkout", {
        metodoPago: backendMetodo,
        tarjetaNumero: backendMetodo === "TARJETA" ? cardNum.replace(/\s/g, "") : undefined,
        titular: backendMetodo === "TARJETA" ? (cardNombre + " " + cardApellido) : undefined,
        cvv: backendMetodo === "TARJETA" ? cardCvv : undefined,
        expiracion: backendMetodo === "TARJETA" ? cardCad : undefined,
        telefonoYape: backendMetodo === "YAPE" ? "900000000" : undefined,
        numeroOperacion: backendMetodo === "TRANSFERENCIA" ? ("OP-" + Date.now()) : undefined,
      });
      await wait(700);
      // Save snapshot BEFORE clearing so success screen shows correct totals
      paidSnapshot.current = {
        items: [...items],
        subtotal,
        igv,
        envioTotal,
        total,
        cliente: nombre + " " + apellidos,
        correo: cardEmail,
      };
      clear();
      await queryClient.invalidateQueries({ queryKey: ["kpis"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      setStep("success");
    } catch (err: unknown) {
      console.error("[handlePay] error:", err);
      const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
      const backendMsg = axiosErr?.response?.data?.message;
      const status = axiosErr?.response?.status;
      let msg = "Error al procesar el pago. Intenta nuevamente.";
      if (backendMsg) {
        msg = backendMsg;
      } else if (status === 401 || status === 403) {
        msg = "Sesion expirada. Por favor vuelve a iniciar sesion.";
      }
      toast.error(msg);
      setStep("payment");
    }
  };

  const downloadReceipt = () => {
    const snap = paidSnapshot.current;
    if (!snap) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Header band
    doc.setFillColor(15, 118, 110); // brand-700
    doc.rect(0, 0, W, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("COMPROBANTE DE PAGO", W / 2, 9, { align: "center" });

    let y = 24;
    doc.setTextColor(30, 30, 30);

    // Order info
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Pedido #" + orderId, margin, y); y += 9;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Fecha: " + new Date().toLocaleString("es-PE"), margin, y);
    doc.text("Estado: PAGADO", W - margin, y, { align: "right" }); y += 5;
    doc.text("Cliente: " + snap.cliente, margin, y);
    doc.text("Correo: " + snap.correo, W - margin, y, { align: "right" }); y += 10;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, W - margin, y); y += 6;

    // Table header
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("PRODUCTO", margin, y);
    doc.text("CANT.", 130, y, { align: "right" });
    doc.text("PRECIO", 155, y, { align: "right" });
    doc.text("TOTAL", W - margin, y, { align: "right" }); y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, W - margin, y); y += 5;

    // Items
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    for (const item of snap.items) {
      doc.setFontSize(8);
      const nameLines = doc.splitTextToSize(item.nombre, 95);
      doc.text(nameLines, margin, y);
      doc.text(String(item.cantidad), 130, y, { align: "right" });
      doc.text("S/ " + item.precio.toFixed(2), 155, y, { align: "right" });
      doc.text("S/ " + (item.precio * item.cantidad).toFixed(2), W - margin, y, { align: "right" });
      y += nameLines.length * 5 + 1;
    }

    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, W - margin, y); y += 6;

    // Totals block
    const col1 = 130;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Subtotal", col1, y);
    doc.text("S/ " + snap.subtotal.toFixed(2), W - margin, y, { align: "right" }); y += 5;
    doc.text("IGV (18%)", col1, y);
    doc.text("S/ " + snap.igv.toFixed(2), W - margin, y, { align: "right" }); y += 5;
    doc.text("Envio", col1, y);
    doc.text(snap.envioTotal === 0 ? "Gratis" : "S/ " + snap.envioTotal.toFixed(2), W - margin, y, { align: "right" }); y += 6;

    // Total band
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(col1 - 5, y - 4, W - margin - col1 + 5 + margin, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110);
    doc.text("TOTAL PAGADO", col1, y + 3);
    doc.text("S/ " + snap.total.toFixed(2), W - margin, y + 3, { align: "right" }); y += 14;

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, W - margin, y); y += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text("Gracias por su compra. Este documento es un comprobante de pago electronico.", W / 2, y, { align: "center" });

    doc.save("comprobante-" + orderId + ".pdf");
  };

  if (items.length === 0 && step !== "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Tu carrito esta vacio</h2>
          <p className="text-gray-500 text-sm mb-6">Agrega productos desde el catalogo para comenzar.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            <ArrowLeft className="w-4 h-4" /> Ver catalogo
          </Link>
        </div>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Procesando tu pago</h2>
          <p className="text-sm text-gray-500">{processingMsg}</p>
          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" /><Lock className="w-3.5 h-3.5" /> Conexion segura SSL
          </div>
        </div>
      </div>
    );
  }

  if (step === "success") {
    const snap = paidSnapshot.current;
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Compra exitosa!</h2>
          <p className="text-sm text-gray-500 mb-1">Pedido <span className="font-semibold text-gray-700">#{orderId}</span></p>
          <p className="text-sm text-gray-500 mb-6">Recibirás un correo de confirmacion en <span className="font-medium">{snap?.correo ?? cardEmail}</span>.</p>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-left mb-6 space-y-2">
            {(snap?.items ?? []).map((i) => (
              <div key={i.id} className="flex justify-between text-sm text-slate-700">
                <span>{i.nombre} x {i.cantidad}</span>
                <span className="font-semibold">S/ {(i.precio * i.cantidad).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>S/ {(snap?.subtotal ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>IGV (18%)</span>
              <span>S/ {(snap?.igv ?? 0).toFixed(2)}</span>
            </div>
            {(snap?.envioTotal ?? 0) > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Envio</span>
                <span>S/ {snap!.envioTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-gray-800">
              <span>Total pagado</span>
              <span className="text-brand-700">S/ {(snap?.total ?? 0).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={downloadReceipt}
              className="inline-flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 active:scale-95 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-150"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar comprobante
            </button>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 border border-gray-300 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50 active:scale-95 text-gray-600 text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-150"
            >
              Seguir comprando
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { key: "shipping", label: "Envio" },
    { key: "payment",  label: "Pago"  },
    { key: "success",  label: "Confirmacion" },
  ];
  const stepIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="text-gray-400 hover:text-brand-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Finalizar compra</h1>
            <p className="text-sm text-gray-500">{items.reduce((a, i) => a + i.cantidad, 0)} productos en tu carrito</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, idx) => {
            let textColor = "text-gray-400";
            if (idx < stepIdx) textColor = "text-emerald-600";
            else if (idx === stepIdx) textColor = "text-brand-700";
            let badgeCls = "bg-gray-100 text-gray-400";
            if (idx < stepIdx) badgeCls = "bg-emerald-100 text-emerald-600";
            else if (idx === stepIdx) badgeCls = "bg-brand-100 text-brand-700";
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className={"flex items-center gap-1.5 text-sm font-medium " + textColor}>
                  <span className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold " + badgeCls}>
                    {idx < stepIdx ? "\u2713" : idx + 1}
                  </span>
                  {s.label}
                </div>
                {idx < steps.length - 1 && <div className="w-8 h-px bg-gray-300" />}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">

            {step === "shipping" && (
              <>
                {!isLoggedIn && shippingSubStep === "form" && !guestEmail.includes("@") && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-1">Informacion de contacto</h2>
                    <p className="text-sm text-gray-500 mb-5">Ingresa tu correo para continuar como invitado o inicia sesion.</p>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo electronico</label>
                    <input type="email" className="input-field mb-4" placeholder="correo@ejemplo.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                    <button onClick={handleGuestContinue} className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 rounded-xl transition-colors mb-3">
                      Continuar como invitado
                    </button>
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400">o</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <button onClick={() => navigate("/login")} className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition-colors hover:bg-gray-50 flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Iniciar sesion con Google
                    </button>
                  </div>
                )}

                {(isLoggedIn || guestEmail.includes("@")) && shippingSubStep === "form" && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Direccion de envio</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                        <input className="input-field" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos *</label>
                        <input className="input-field" value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="Perez" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo documento</label>
                        <select className="input-field" value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>
                          <option>DNI</option><option>CE</option><option>RUC</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Numero documento *</label>
                        <input className="input-field" value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="12345678" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Telefono *</label>
                      <input className="input-field" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="900000000" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Calle / Avenida *</label>
                        <input className="input-field" value={calle} onChange={(e) => setCalle(e.target.value)} placeholder="Av. Larco" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Numero</label>
                        <input className="input-field" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="150" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Piso / Dpto (opcional)</label>
                      <input className="input-field" value={piso} onChange={(e) => setPiso(e.target.value)} placeholder="Piso 3, Dpto 301" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad *</label>
                        <input className="input-field" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Trujillo" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Provincia/Estado</label>
                        <input className="input-field" value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="La Libertad" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Codigo postal</label>
                        <input className="input-field" value={cp} onChange={(e) => setCp(e.target.value)} placeholder="13001" />
                      </div>
                    </div>
                    <button onClick={handleShippingFormContinue} className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 rounded-xl transition-colors">
                      Continuar
                    </button>
                  </div>
                )}

                {shippingSubStep === "method" && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Metodo de envio</h2>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-sm text-slate-700">
                      <p className="font-semibold text-slate-800 mb-1">Direccion de entrega</p>
                      <p>{nombre} {apellidos}</p>
                      <p>{calle} {numero}{piso ? ", " + piso : ""}, {ciudad}, {estado} {cp}</p>
                      <button onClick={() => setShippingSubStep("form")} className="mt-2 text-xs text-brand-700 hover:underline font-medium">Modificar</button>
                    </div>
                    <div className="space-y-3 mb-6">
                      {(["RETIRO", "DOMICILIO"] as const).map((value) => {
                        const isRetiro = value === "RETIRO";
                        return (
                          <label key={value} className={"flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors " + (envioMetodo === value ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-brand-300")}>
                            <input type="radio" className="sr-only" checked={envioMetodo === value} onChange={() => setEnvioMetodo(value)} />
                            <span className={"w-4 h-4 rounded-full border-2 flex-shrink-0 " + (envioMetodo === value ? "border-brand-600 bg-brand-600" : "border-gray-400")} />
                            {isRetiro ? <Store className="w-5 h-5 text-brand-600" /> : <Truck className="w-5 h-5 text-brand-600" />}
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800 text-sm">{isRetiro ? "Retiro en tienda" : "Envio a domicilio"}</p>
                              <p className="text-xs text-gray-500">{isRetiro ? "Recoge tu pedido en nuestra tienda" : "Entrega en 2-4 dias habiles"}</p>
                            </div>
                            <span className={"font-bold text-sm " + (isRetiro ? "text-emerald-600" : "text-gray-800")}>{isRetiro ? "Gratis" : "S/ " + envioPrice.toFixed(2)}</span>
                          </label>
                        );
                      })}
                    </div>
                    <button onClick={() => setStep("payment")} className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 rounded-xl transition-colors">
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}

            {step === "payment" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-5">Revisar y confirmar compra</h2>
                <div className="mb-5 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold opacity-70">{item.nombre.slice(0,2).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>
                        <p className="text-xs text-gray-500">x {item.cantidad}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => decrement(item.id)} className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center"><Minus className="w-3 h-3 text-gray-600" /></button>
                        <span className="text-xs font-semibold w-5 text-center">{item.cantidad}</span>
                        <button onClick={() => increment(item.id)} className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center"><Plus className="w-3 h-3 text-gray-600" /></button>
                        <button onClick={() => remove(item.id)} className="w-6 h-6 rounded bg-red-50 flex items-center justify-center ml-1"><Trash2 className="w-3 h-3 text-red-500" /></button>
                      </div>
                      <span className="text-sm font-bold text-brand-700 w-16 text-right">S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <h3 className="font-semibold text-gray-800 mb-3">Metodo de pago</h3>
                <div className="space-y-2 mb-4">
                  {([
                    { value: "TARJETA", label: "Pago con tarjeta de credito o debito", desc: "VISA, Mastercard, AMEX, Diners" },
                    { value: "IZIPAY",  label: "Pago en cuotas",                       desc: "Financiamiento disponible" },
                    { value: "YAPE",    label: "Izipay: YAPE, QR",                     desc: "Paga con tu billetera digital" },
                  ] as const).map(({ value, label, desc }) => (
                    <label key={value} className={"flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors " + (metodoPago === value ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-brand-300")}>
                      <input type="radio" className="sr-only" checked={metodoPago === value} onChange={() => setMetodoPago(value)} />
                      <span className={"w-4 h-4 rounded-full border-2 flex-shrink-0 " + (metodoPago === value ? "border-brand-600 bg-brand-600" : "border-gray-400")} />
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex gap-2 mb-4">
                  {[{label:"VISA",bg:"bg-blue-600"},{label:"MC",bg:"bg-red-500"},{label:"AMEX",bg:"bg-cyan-600"},{label:"QR",bg:"bg-gray-700"},{label:"YAPE",bg:"bg-fuchsia-600"}].map((c) => (
                    <span key={c.label} className={"inline-flex items-center justify-center w-10 h-7 rounded text-white text-xs font-bold " + c.bg}>{c.label}</span>
                  ))}
                </div>

                {metodoPago === "TARJETA" && (
                  <>
                    <div className="flex gap-2 mb-3">
                      {(["VISA","MASTERCARD","AMEX"] as MarcaTarjeta[]).map((m) => (
                        <button key={m} type="button" onClick={() => setMarcaTarjeta(m)} className={"flex-1 py-2 text-xs font-bold rounded-lg border " + (marcaTarjeta === m ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600")}>{m}</button>
                      ))}
                    </div>
                    <button type="button" onClick={applyTestCard} className="w-full border border-dashed border-brand-400 text-brand-700 text-sm font-medium py-2.5 rounded-xl hover:bg-brand-50 transition-colors mb-3 flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" /> Usar datos de prueba ({marcaTarjeta})
                    </button>
                  </>
                )}

                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Numero de tarjeta</label>
                    <input className="input-field" placeholder="0000 0000 0000 0000" value={cardNum} onChange={(e) => setCardNum(formatCard(e.target.value))} maxLength={19} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Caducidad</label>
                      <input className="input-field" placeholder="MM/AA" value={cardCad} onChange={(e) => setCardCad(e.target.value)} maxLength={5} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CVV</label>
                      <input className="input-field" placeholder="..." value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} maxLength={4} type="password" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nombres</label>
                      <input className="input-field" placeholder="Juan" value={cardNombre} onChange={(e) => setCardNombre(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos</label>
                      <input className="input-field" placeholder="Perez" value={cardApellido} onChange={(e) => setCardApellido(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Correo electronico</label>
                    <input className="input-field" type="email" placeholder="correo@ejemplo.com" value={cardEmail} onChange={(e) => setCardEmail(e.target.value)} />
                  </div>
                </div>

                <label className="flex items-start gap-2 mb-5 cursor-pointer">
                  <input type="checkbox" className="mt-1 accent-brand-700" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} />
                  <span className="text-xs text-gray-600">Acepto los <span className="text-brand-700 font-medium">terminos y condiciones</span> y la <span className="text-brand-700 font-medium">politica de privacidad</span>.</span>
                </label>

                <div className="flex gap-3">
                  <button onClick={() => setStep("shipping")} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    Atras
                  </button>
                  <button onClick={handlePay} className="flex-1 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" /> Pagar S/ {total.toFixed(2)}
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /><Lock className="w-3.5 h-3.5" /> Transaccion cifrada SSL
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-brand-600" />
                <h2 className="text-base font-bold text-gray-800">Resumen del pedido</h2>
              </div>
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-gray-700">
                    <span className="truncate flex-1 pr-2">{item.nombre} <span className="text-gray-400">x{item.cantidad}</span></span>
                    <span className="font-medium flex-shrink-0">S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm text-gray-600 mb-4">
                <div className="flex justify-between"><span>Subtotal</span><span>S/ {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>IGV (18%)</span><span>S/ {igv.toFixed(2)}</span></div>
                <div className="flex justify-between">
                  <span>Envio</span>
                  <span className={envioTotal === 0 ? "text-emerald-600 font-medium" : ""}>{envioTotal === 0 ? "Gratis" : "S/ " + envioTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-800">
                <span>Total</span>
                <span className="text-brand-700 text-lg">S/ {total.toFixed(2)}</span>
              </div>
              <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5" /><Lock className="w-3.5 h-3.5" /> Compra segura
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};