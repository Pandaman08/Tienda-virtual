import { create } from "zustand";

type Rol = "ADMIN" | "CLIENTE";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  rol: Rol | null;
  setSession: (payload: { accessToken: string; refreshToken: string; rol: Rol }) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  rol: null,
  setSession: (payload) => set(payload),
  logout: () => set({ accessToken: null, refreshToken: null, rol: null })
}));
