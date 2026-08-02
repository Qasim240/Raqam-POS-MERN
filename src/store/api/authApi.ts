import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    email: string;
    role?: string;
    permissions?: Record<string, boolean>;
    token: string;
  };
}

// Mirror the API base used by services/api.ts. Default '/api' is proxied by the
// Vite dev server to the local backend (see vite.config.ts), keeping everything
// same-origin through a single tunnel. Override via VITE_API_BASE if needed.
const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) || "/api";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE}/auth`,
    prepareHeaders: (headers) => {
      // Skip the localtunnel / ngrok-free browser interstitial.
      headers.set("bypass-tunnel-reminder", "true");
      headers.set("ngrok-skip-browser-warning", "true");
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
    }),
    getMe: builder.query<AuthResponse, void>({
      query: () => "/me",
    }),
  }),
});

export const { useLoginMutation, useGetMeQuery } = authApi;
