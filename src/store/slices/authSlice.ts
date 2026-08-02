import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  permissions?: Record<string, boolean>;
}

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isLoggedIn: boolean;
}

// Load from localStorage on startup
const token = localStorage.getItem("token");
const user = localStorage.getItem("adminUser");

const initialState: AuthState = {
  user: user ? JSON.parse(user) : null,
  token: token || null,
  isLoggedIn: !!token,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: AdminUser; token: string }>
    ) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoggedIn = true;

      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("adminUser", JSON.stringify(action.payload.user));
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isLoggedIn = false;

      localStorage.removeItem("token");
      localStorage.removeItem("adminUser");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
