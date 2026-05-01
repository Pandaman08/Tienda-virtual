import { useState, useEffect } from "react";
import { UseMutationResult } from "@tanstack/react-query";
import { Ban, PlusCircle, Save, X } from "lucide-react";
import toast from "react-hot-toast";

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

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    id: number;
    sku: string;
    nombre: string;
    descripcion?: string | null;
    imagen_url?: string | null;
    categoria: string;
    precio: number;
    stock_minimo: number;
  } | null;
  createMutation: UseMutationResult<void, Error, ProductFormState, unknown>;
  updateMutation: UseMutationResult<void, Error, ProductFormState & { id: number }, unknown>;
};

const emptyForm: ProductFormState = {
  sku: "",
  nombre: "",
  descripcion: "",
  imagenUrl: "",
  imagenFile: null,
  categoria: "",
  precio: "",
  stockMinimo: "5"
};

export const ProductModal = ({
  isOpen,
  onClose,
  product,
  createMutation,
  updateMutation
}: ProductModalProps) => {
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [previewUrl, setPreviewUrl] = useState("");
  const isEditing = !!product;
  const isLoading = createMutation.isPending || updateMutation.isPending;
  const submitText = isLoading ? "Procesando..." : isEditing ? "Guardar cambios" : "Crear";

  useEffect(() => {
    if (product) {
      setForm({
        sku: product.sku,
        nombre: product.nombre,
        descripcion: product.descripcion || "",
        imagenUrl: product.imagen_url || "",
        imagenFile: null,
        categoria: product.categoria,
        precio: String(product.precio),
        stockMinimo: String(product.stock_minimo)
      });
    } else {
      setForm(emptyForm);
    }
  }, [product, isOpen]);

  useEffect(() => {
    if (!form.imagenFile) {
      setPreviewUrl(form.imagenUrl);
      return;
    }

    const objectUrl = URL.createObjectURL(form.imagenFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [form.imagenFile, form.imagenUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && product) {
      updateMutation.mutate({ ...form, id: product.id });
    } else {
      createMutation.mutate(form);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 inline-flex items-center justify-center"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              SKU
            </label>
            <input
              className="input-field"
              placeholder="SKU"
              value={form.sku}
              disabled={isEditing || isLoading}
              onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre
            </label>
            <input
              className="input-field"
              placeholder="Nombre del producto"
              value={form.nombre}
              onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Categoría
            </label>
            <input
              className="input-field"
              placeholder="Ej: Electrónica, Accesorios"
              value={form.categoria}
              onChange={(e) => setForm((s) => ({ ...s, categoria: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Precio (PEN)
            </label>
            <input
              className="input-field"
              placeholder="0.00"
              type="number"
              step="0.01"
              value={form.precio}
              onChange={(e) => setForm((s) => ({ ...s, precio: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Stock Mínimo
              </label>
              <input
                className="input-field"
                placeholder="5"
                type="number"
                value={form.stockMinimo}
                onChange={(e) => setForm((s) => ({ ...s, stockMinimo: e.target.value }))}
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descripción
            </label>
            <textarea
              className="input-field resize-none"
              placeholder="Descripción del producto"
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Imagen
            </label>
            <input
              className="input-field"
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  toast.error("La imagen supera 5MB");
                  return;
                }
                setForm((s) => ({ ...s, imagenFile: file }));
                toast.success("Imagen lista para subir");
              }}
              disabled={isLoading}
            />
            {previewUrl && (
              <div className="mt-3">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-full h-40 object-cover rounded-lg border border-slate-200"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Ban className="w-4 h-4" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="h-9 px-3 rounded-lg bg-violet-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
