import { useEffect, useMemo, useState } from "react";
import { ArrowRight, LogIn, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { useCartStore } from "../stores/cart.store";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
  const { rol } = useAuthStore();
  const { items, remove, increment, decrement, hydrate } = useCartStore();
  const [hovering, setHovering] = useState(false);
  const navigate = useNavigate();

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.precio * item.cantidad, 0),
    [items]
  );
  const igv = useMemo(() => subtotal * 0.18, [subtotal]);
  const total = useMemo(() => subtotal + igv, [subtotal, igv]);
  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.cantidad, 0),
    [items]
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const hasItems = items.length > 0;
  const expanded = isOpen || hovering;

  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [expanded]);

  // Unmount completely when closed and cart empty
  if (!hasItems && !isOpen) return null;

  let drawerTranslate = "translate-x-full";
  if (expanded) drawerTranslate = "translate-x-0";
  else if (hasItems) drawerTranslate = "translate-x-[calc(100%-3rem)]";

  const handleClose = () => {
    onClose();
    setHovering(false);
  };

  const goToCheckout = () => {
    onClose();
    setHovering(false);
    navigate("/carrito");
  };

  const goToLogin = () => {
    onClose();
    setHovering(false);
    navigate("/login");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          expanded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden
      >
        <button
          type="button"
          aria-label="Cerrar carrito"
          className="absolute inset-0 bg-black/40"
          onClick={handleClose}
        />
      </div>

      {/* Drawer */}
      <section
        aria-label="Carrito de compras"
        onMouseLeave={() => { if (!isOpen) setHovering(false); }}
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col z-[61]
          transition-transform duration-300 ease-in-out ${drawerTranslate}`}
      >
        {/* Tab visible cuando el drawer está asomado — hover lo abre */}
        <div
          onMouseEnter={() => setHovering(true)}
          aria-hidden
          className={`absolute left-0 top-0 h-full w-12 flex flex-col items-center justify-center gap-3 cursor-pointer
            transition-opacity duration-200 ${expanded ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
          {/* Borde degradado de marca */}
          <span className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-brand-500 to-transparent" />
          {/* Icono carrito + badge */}
          <div className="relative">
            <ShoppingCart className="w-5 h-5 text-brand-700" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2.5 bg-brand-700 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Mi carrito</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 inline-flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500 mb-4">Aun no agregaste productos.</p>
              <Link
                to="/"
                onClick={handleClose}
                className="inline-flex items-center gap-2 text-sm text-brand-700 font-semibold"
              >
                <ShoppingCart className="w-4 h-4" />
                Ir al catalogo
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">{item.nombre}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.cantidad} x S/ {item.precio.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => decrement(item.id)}
                      className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 inline-flex items-center justify-center"
                      aria-label="Restar unidad"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="min-w-6 text-center text-sm font-semibold text-gray-700">{item.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => increment(item.id)}
                      className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 inline-flex items-center justify-center"
                      aria-label="Sumar unidad"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-brand-700 min-w-20 text-right">
                    S/ {(item.cantidad * item.precio).toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 inline-flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="border-t border-gray-200 p-5 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold">S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IGV (18%)</span>
              <span className="font-semibold">S/ {igv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-gray-800">
              <strong>Total</strong>
              <strong className="text-brand-700 text-base">S/ {total.toFixed(2)}</strong>
            </div>
          </div>
          {rol ? (
            <button
              type="button"
              onClick={goToCheckout}
              className="w-full inline-flex justify-center items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              Ir a checkout
            </button>
          ) : (
            <button
              type="button"
              onClick={goToLogin}
              className="w-full inline-flex justify-center items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Ingresar para comprar
            </button>
          )}
        </div>
      </section>
    </>
  );
};
