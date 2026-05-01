import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { useStoreConfig } from "../stores/store-config.store";

export const Footer = () => {
  const { rol } = useAuthStore();
  const storeConfig = useStoreConfig();

  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
        {/* Marca */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-brand-600 flex-shrink-0">
              {storeConfig.logo ? (
                <img src={storeConfig.logo} alt={storeConfig.nombre} className="w-full h-full object-contain" />
              ) : (
                <span className="text-white text-xs font-bold">
                  {storeConfig.nombre.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-white font-bold truncate">{storeConfig.nombre}</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Tu tienda online de confianza. Productos de calidad con los mejores precios y envío rápido.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-3">Navegación</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white transition-colors">Catálogo</Link></li>
            {rol !== "ADMIN" && <li><Link to="/carrito" className="hover:text-white transition-colors">Mi carrito</Link></li>}
            <li><Link to="/login" className="hover:text-white transition-colors">Ingresar</Link></li>
          </ul>
        </div>

        {/* Contacto */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-3">Contacto</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              soporte@tiendavirtual.pe
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              +51 900 000 000
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Lima, Perú
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <span>© {new Date().getFullYear()} {storeConfig.nombre}. Todos los derechos reservados.</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Pago seguro
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Envío rápido
          </span>
        </div>
      </div>
    </div>
    </footer>
  );
};
