import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  forcePasswordChange?: boolean;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    return response.json();
  },

  register: async (userData: {
    username: string;
    password: string;
    name: string;
    email: string;
    role: string;
  }): Promise<LoginResponse> => {
    const response = await apiRequest("POST", "/api/auth/register", userData);
    return response.json();
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("forcePasswordChange");
  },

  getToken: (): string | null => {
    return localStorage.getItem("token");
  },

  getUser: (): User | null => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  setAuth: (token: string, user: User, forcePasswordChange?: boolean) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("forcePasswordChange", forcePasswordChange?.toString() || "false");
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("token");
  },

  needsPasswordChange: (): boolean => {
    return localStorage.getItem("forcePasswordChange") === "true";
  },

  clearPasswordChangeFlag: () => {
    localStorage.setItem("forcePasswordChange", "false");
  },
};
