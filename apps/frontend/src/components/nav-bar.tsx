import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, ClipboardList, LayoutDashboard, LogOut, Settings, ShoppingCart, User } from "lucide-react";
import { useAuthStore } from "../stores/auth.store";
import { useCartStore } from "../stores/cart.store";
import { useStoreConfig } from "../stores/store-config.store";

type NavBarProps = {
  onCartClick?: () => void;
};

export const NavBar = ({ onCartClick }: NavBarProps) => {
  const { rol, email, logout } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const navigate = useNavigate();
  const cartCount = items.reduce((acc, i) => acc + i.cantidad, 0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const storeConfig = useStoreConfig();
  const location = useLocation();

  // Sync search input with ?q= URL param
  const searchParams = new URLSearchParams(location.search);
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchValue(params.get("q") ?? "");
  }, [location.search]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    navigate(value.trim() ? `/?${params.toString()}` : "/", { replace: location.pathname === "/" });
  };

  const avatarLetters = email ? email.slice(0, 2).toUpperCase() : (rol ?? "U").slice(0, 2).toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0 bg-brand-700 group-hover:opacity-90 transition-opacity">
              {storeConfig.logo ? (
                <img src={storeConfig.logo} alt={storeConfig.nombre} className="w-full h-full object-contain" />
              ) : (
                <span className="text-white text-sm font-extrabold tracking-tight">
                  {storeConfig.nombre.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-lg font-bold text-brand-700 hidden sm:block tracking-tight truncate max-w-[180px]">
              {storeConfig.nombre}
            </span>
          </Link>

          {/* Barra de búsqueda */}
          <div className="flex-1 max-w-xl mx-auto">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Admin link */}
            {rol === "ADMIN" && (
              <Link
                to="/admin"
                className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-700 px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Panel Admin
              </Link>
            )}

            {/* Carrito */}
            {rol !== "ADMIN" && (
              <button
                type="button"
                onClick={onCartClick}
                className="relative flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-700 px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden sm:block">Carrito</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-700 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Usuario: dropdown si tiene sesión, botón ingresar si no */}
            {rol ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-white text-xs font-bold">{avatarLetters}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">

                    {/* Header del dropdown */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-sm flex-shrink-0">
                          <span className="text-white text-sm font-bold">{avatarLetters}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{email ?? "Usuario"}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5 ${rol === "ADMIN" ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-700"}`}>
                            {rol === "ADMIN" ? "Administrador" : "Cliente"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Opciones */}
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => { setUserMenuOpen(false); navigate("/perfil"); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left cursor-pointer border-0 bg-transparent"
                      >
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-brand-700" />
                        </div>
                        <div>
                          <p className="font-medium">Mi Perfil</p>
                          <p className="text-xs text-gray-400">Ver datos de tu cuenta</p>
                        </div>
                      </button>

                      {rol === "CLIENTE" && (
                        <button
                          type="button"
                          onClick={() => { setUserMenuOpen(false); navigate("/pedidos"); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left cursor-pointer border-0 bg-transparent"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <ClipboardList className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium">Mis Pedidos</p>
                            <p className="text-xs text-gray-400">Historial de compras</p>
                          </div>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => { setUserMenuOpen(false); navigate("/configuracion"); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left cursor-pointer border-0 bg-transparent"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Settings className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">Configuración</p>
                          <p className="text-xs text-gray-400">Seguridad y contraseña</p>
                        </div>
                      </button>
                    </div>

                    <div className="border-t border-gray-100 py-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer border-0 bg-transparent"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                          <LogOut className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium">Cerrar sesión</p>
                          <p className="text-xs text-red-400">Salir de tu cuenta</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                <User className="w-4 h-4" />
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

