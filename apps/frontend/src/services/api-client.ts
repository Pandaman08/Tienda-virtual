import axios from "axios";
import { useAuthStore } from "../stores/auth.store";

export const apiClient = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL ?? "http://localhost:4000/api/v1"
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Interceptor de refresco de token ---
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as import("axios").AxiosError & { config: import("axios").InternalAxiosRequestConfig & { _retry?: boolean } };

    if (axiosError.response?.status === 401 && !axiosError.config?._retry) {
      const { refreshToken, setSession, logout, rol, email } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        throw error;
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          axiosError.config.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(axiosError.config);
        });
      }

      axiosError.config._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(
          "http://localhost:4000/api/v1/auth/refresh",
          { refreshToken }
        );
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data.data;
        setSession({ accessToken: newAccessToken, refreshToken: newRefreshToken, rol: rol!, email: email! });
        processQueue(null, newAccessToken);
        axiosError.config.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(axiosError.config);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    throw error;
  }
);
