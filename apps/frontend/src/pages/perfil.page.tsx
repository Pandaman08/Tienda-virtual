import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { User, Mail, Phone, Save, ShoppingBag, Calendar } from "lucide-react";
import { apiClient } from "../services/api-client";
import { useAuthStore } from "../stores/auth.store";

type MeResponse = {
  id: number;
  email: string;
  activo: boolean;
  created_at: string;
  rol: { id: number; nombre: string };
  cliente: {
    id: number;
    nombre: string;
    apellido: string;
    telefono?: string | null;
    email: string;
  } | null;
};

export const PerfilPage = () => {
  const { email: authEmail, rol } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MeResponse }>("/usuarios/me");
      return res.data.data;
    }
  });

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (me) {
      setNombre(me.cliente?.nombre ?? "");
      setApellido(me.cliente?.apellido ?? "");
      setTelefono(me.cliente?.telefono ?? "");
      setEmail(me.email);
    }
  }, [me]);

  const updatePerfil = useMutation({
    mutationFn: () =>
      apiClient.patch("/usuarios/me", { nombre, apellido, telefono, email }),
    onSuccess: () => {
      toast.success("Perfil actualizado");
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => toast.error("No se pudo actualizar el perfil")
  });

  const avatarLetters = me?.cliente
    ? `${me.cliente.nombre[0] ?? ""}${me.cliente.apellido[0] ?? ""}`.toUpperCase()
    : (authEmail ?? "U").slice(0, 2).toUpperCase();

  const memberSince = me
    ? new Date(me.created_at).toLocaleDateString("es-PE", { year: "numeric", month: "long" })
    : "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white text-xl font-extrabold">{avatarLetters}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-slate-800 truncate">
                {me?.cliente ? `${me.cliente.nombre} ${me.cliente.apellido}` : (authEmail ?? "Usuario")}
              </h1>
              <p className="text-sm text-slate-500 truncate mt-0.5">{me?.email}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${rol === "ADMIN" ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-700"}`}>
                  {rol === "ADMIN" ? "Administrador" : "Cliente"}
                </span>
                {memberSince && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    Miembro desde {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-brand-700" />
            Datos personales
          </h2>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updatePerfil.mutate();
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="perfil-nombre" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Nombre
                </label>
                <input
                  id="perfil-nombre"
                  className="input-field"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label htmlFor="perfil-apellido" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Apellido
                </label>
                <input
                  id="perfil-apellido"
                  className="input-field"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            <div>
              <label htmlFor="perfil-email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> Correo electrónico</span>
              </label>
              <input
                id="perfil-email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label htmlFor="perfil-telefono" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</span>
              </label>
              <input
                id="perfil-telefono"
                className="input-field"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="999 000 000"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={updatePerfil.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Save className="w-4 h-4" />
                {updatePerfil.isPending ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>

        {/* Info cuenta */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-700" />
            Información de la cuenta
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-slate-500 font-medium">Miembro desde</dt>
              <dd className="text-slate-800 font-semibold">{memberSince}</dd>
            </div>
          </dl>
        </div>

      </div>
    </div>
  );
};
