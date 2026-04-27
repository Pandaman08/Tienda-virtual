import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { useCartStore } from "../stores/cart.store";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
  const { rol } = useAuthStore();
  const { items, remove, hydrate } = useCartStore();

  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.precio * item.cantidad, 0),
    [items]
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60]" aria-modal="true" role="dialog">
      <button
        type="button"
        aria-label="Cerrar carrito"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Mi carrito</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500 mb-4">Aun no agregaste productos.</p>
              <Link
                to="/"
                onClick={onClose}
                className="inline-flex items-center gap-2 text-sm text-brand-700 font-semibold"
              >
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
                  <p className="text-sm font-bold text-brand-700">
                    S/ {(item.cantidad * item.precio).toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    -
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="border-t border-gray-200 p-5 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total</span>
            <strong className="text-brand-700 text-base">S/ {total.toFixed(2)}</strong>
          </div>
          {rol ? (
            <Link
              to="/carrito"
              onClick={onClose}
              className="w-full inline-flex justify-center items-center bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3 rounded-xl"
            >
              Ir a checkout
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="w-full inline-flex justify-center items-center bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3 rounded-xl"
            >
              Ingresar para comprar
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
};
