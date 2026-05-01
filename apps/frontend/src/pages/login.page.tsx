import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { ClipboardCopy, LogIn, Pointer, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../services/api-client";
import { useAuthStore } from "../stores/auth.store";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginForm = z.infer<typeof loginSchema>;

type LoginResponse = {
  data: {
    accessToken: string;
    refreshToken: string;
    usuario: {
      rol: "ADMIN" | "CLIENTE";
      email: string;
    };
  };
};

const demoCredentials = [
  {
    label: "Administrador",
    email: "admin@tienda.com",
    password: "Admin123*"
  },
  {
    label: "Cliente",
    email: "ana@example.com",
    password: "Cliente123*"
  }
] as const;

export const LoginPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await apiClient.post<LoginResponse>("/auth/login", values);
      const payload = response.data.data;
      setSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        rol: payload.usuario.rol,
        email: payload.usuario.email
      });
      toast.success("¡Bienvenido de vuelta!", { icon: "👋" });
      navigate(payload.usuario.rol === "ADMIN" ? "/admin" : "/");
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : "No se pudo iniciar sesion. Verifica que el backend este activo.";

      toast.error(message || "Error de autenticacion");
    }
  });

  const copyCredentials = async (email: string, password: string) => {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
      toast.success("Credenciales copiadas");
    } catch {
      toast.error("No se pudo copiar. Copia manualmente el texto.");
    }
  };

  const applyCredentials = (email: string, password: string) => {
    form.setValue("email", email, { shouldValidate: true });
    form.setValue("password", password, { shouldValidate: true });
    toast.success("Credenciales cargadas");
  };

  const { formState: { errors, isSubmitting } } = form;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-700 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">TV</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Iniciar sesión</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresa a tu cuenta de TiendaVirtual</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="mb-6 rounded-xl border border-brand-100 bg-brand-50/60 p-4 space-y-3">
            <p className="text-xs font-semibold tracking-wide text-brand-800 uppercase">Credenciales de ejemplo</p>
            <div className="space-y-2">
              {demoCredentials.map((cred) => (
                <div key={cred.email} className="rounded-lg border border-brand-100 bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-700">{cred.label}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void copyCredentials(cred.email, cred.password)}
                        className="text-xs font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
                      >
                        <ClipboardCopy className="w-3.5 h-3.5" />
                        Copiar
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCredentials(cred.email, cred.password)}
                        className="text-xs font-semibold text-gray-600 hover:text-gray-800 inline-flex items-center gap-1"
                      >
                        <Pointer className="w-3.5 h-3.5" />
                        Usar
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 break-all">Email: {cred.email}</p>
                  <p className="text-xs text-gray-600">Password: {cred.password}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  id="login-email"
                  {...form.register("email")}
                  type="email"
                  placeholder="tu@email.com"
                  className={`w-full pl-10 pr-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition ${errors.email ? "border-red-400 bg-red-50" : "border-gray-300 bg-gray-50"}`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  id="login-password"
                  {...form.register("password")}
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  className={`w-full pl-10 pr-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition ${errors.password ? "border-red-400 bg-red-50" : "border-gray-300 bg-gray-50"}`}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all duration-200 border-0 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Solo estás mirando?{" "}
          <Link to="/" className="text-brand-700 font-semibold hover:underline">
            Ir al catálogo
          </Link>
        </p>
      </div>
    </div>
  );
};

