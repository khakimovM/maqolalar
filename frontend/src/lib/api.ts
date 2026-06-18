import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuth } from "@/lib/store/auth";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Har so'rovga access tokenni biriktiramiz
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuth.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData (fayl yuklash) bo'lsa — Content-Type ni o'chiramiz,
  // brauzer multipart boundary ni o'zi qo'yadi.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
  return config;
});

// 401 bo'lsa — bir marta refresh qilib, so'rovni qayta yuboramiz.
// Parallel 401 larni bitta refresh bilan navbatga olamiz.
let isRefreshing = false;
let queue: { resolve: (t: string) => void; reject: (e: unknown) => void }[] = [];

function flushQueue(error: unknown, token: string | null) {
  queue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;
    const { refreshToken, setAccessToken, logout } = useAuth.getState();

    // Refresh endpointining o'zi yiqilsa — qayta urinmaymiz
    const isRefreshCall = original?.url?.includes("/auth/refresh");

    if (status === 401 && !original?._retry && refreshToken && !isRefreshCall) {
      if (isRefreshing) {
        // Boshqa refresh tugashini kutamiz
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => {
              if (original.headers)
                original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        const newToken: string = data.data.accessToken;
        setAccessToken(newToken);
        flushQueue(null, newToken);
        if (original.headers)
          original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (err) {
        flushQueue(err, null);
        logout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

/** Backend { statusCode, message, data } konvertidan faqat data ni oladi. */
export async function apiData<T>(
  promise: Promise<{ data: { data: T } }>,
): Promise<T> {
  const res = await promise;
  return res.data.data;
}

/** Xato xabarini backend formatidan chiqaradi. */
export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (
      (err.response?.data as { message?: string })?.message ??
      err.message ??
      "Xatolik yuz berdi"
    );
  }
  return "Xatolik yuz berdi";
}
