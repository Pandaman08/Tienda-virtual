import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { apiClient } from "../services/api-client";

export const ConfiguracionPage = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const changePassword = useMutation({
    mutationFn: () =>
      apiClient.patch("/usuarios/me/password", { currentPassword, newPassword }),
    onSuccess: () => {
      toast.success("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo actualizar la contraseña";
      toast.error(msg);
    }
  });

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    changePassword.mutate();
  };

  const strength = (() => {
    if (newPassword.length === 0) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  })();

  const strengthLabel = ["", "Débil", "Regular", "Buena", "Fuerte"][strength];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-brand-500", "bg-emerald-500"][strength];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-700" />
            Configuración de seguridad
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona la seguridad de tu cuenta</p>
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-700" />
            Cambiar contraseña
          </h2>

          <form className="space-y-4" onSubmit={handleSubmitPassword}>
            {/* Contraseña actual */}
            <div>
              <label htmlFor="cfg-current" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  id="cfg-current"
                  type={showCurrent ? "text" : "password"}
                  className="input-field pr-10"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer"
                  aria-label={showCurrent ? "Ocultar" : "Mostrar"}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label htmlFor="cfg-new" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="cfg-new"
                  type={showNew ? "text" : "password"}
                  className="input-field pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer"
                  aria-label={showNew ? "Ocultar" : "Mostrar"}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Indicador de fuerza */}
              {newPassword.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= strength ? strengthColor : "bg-slate-200"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Seguridad: <span className="font-semibold">{strengthLabel}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="cfg-confirm" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="cfg-confirm"
                  type={showConfirm ? "text" : "password"}
                  className="input-field pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer"
                  aria-label={showConfirm ? "Ocultar" : "Mostrar"}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={changePassword.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Lock className="w-4 h-4" />
                {changePassword.isPending ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>
          </form>
        </div>

        {/* Tips de seguridad */}
        <div className="bg-brand-50 rounded-2xl border border-brand-100 p-5">
          <h3 className="text-sm font-bold text-brand-800 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Recomendaciones de seguridad
          </h3>
          <ul className="space-y-1.5 text-sm text-brand-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" aria-hidden="true"></span>
              <span>Usa al menos 8 caracteres combinando letras, números y símbolos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" aria-hidden="true"></span>
              <span>No reutilices contraseñas de otros servicios</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" aria-hidden="true"></span>
              <span>Cambia tu contraseña periódicamente</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
};
