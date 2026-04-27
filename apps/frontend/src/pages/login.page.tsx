import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
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
    };
  };
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await apiClient.post<LoginResponse>("/auth/login", values);
    const payload = response.data.data;
    setSession({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      rol: payload.usuario.rol
    });
    toast.success("Sesion iniciada");
    navigate(payload.usuario.rol === "ADMIN" ? "/admin" : "/");
  });

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>Iniciar sesion</h1>
      <form className="card" onSubmit={onSubmit}>
        <label>Email</label>
        <input {...form.register("email")} />
        <label style={{ marginTop: "0.75rem", display: "block" }}>Password</label>
        <input type="password" {...form.register("password")} />
        <button className="btn btn-primary" style={{ marginTop: "1rem" }} type="submit">
          Entrar
        </button>
      </form>
    </div>
  );
};
