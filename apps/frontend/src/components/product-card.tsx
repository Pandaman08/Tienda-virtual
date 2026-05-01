type Producto = {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  descripcion?: string;
  imagen_url?: string | null;
};

type Props = {
  producto: Producto;
  onAddToCart: (producto: Producto) => void;
};

// Paleta de colores para los placeholders de imagen por categoría
const categoryColors: Record<string, string> = {
  Electrónica: "from-blue-400 to-blue-600",
  Hogar: "from-orange-400 to-orange-600",
  Ropa: "from-pink-400 to-pink-600",
  Deportes: "from-green-400 to-green-600",
  Libros: "from-yellow-400 to-yellow-600",
};

const getBadge = (precio: number) => {
  if (precio > 500) return { label: "Premium", color: "bg-purple-100 text-purple-700" };
  if (precio < 50) return { label: "Oferta", color: "bg-red-100 text-red-600" };
  return null;
};

export const ProductCard = ({ producto, onAddToCart }: Props) => {
  const gradientClass = categoryColors[producto.categoria] ?? "from-brand-500 to-brand-700";
  const badge = getBadge(producto.precio);
  const initials = producto.nombre.slice(0, 2).toUpperCase();

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
      {/* Imagen / Placeholder */}
      <div className={`relative bg-gradient-to-br ${gradientClass} h-44 flex items-center justify-center`}>
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white text-4xl font-bold opacity-30 select-none">{initials}</span>
        )}
        {/* Badge */}
        {badge && (
          <span className={`absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
        )}
        <span className="absolute top-3 right-3 text-xs font-medium bg-white/80 text-gray-600 px-2 py-1 rounded-full">
          {producto.categoria}
        </span>
      </div>

      {/* Contenido */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 mb-1 group-hover:text-brand-700 transition-colors">
          {producto.nombre}
        </h3>
        {producto.descripcion && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
            {producto.descripcion}
          </p>
        )}

        {/* Rating decorativo */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg key={star} className={`w-3.5 h-3.5 ${star <= 4 ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="text-xs text-gray-400 ml-1">(4.0)</span>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="text-xl font-bold text-brand-700">S/ {Number(producto.precio).toFixed(2)}</span>
          </div>
          <button
            onClick={() => onAddToCart(producto)}
            className="flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 active:scale-95 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-200 border-0 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
};
