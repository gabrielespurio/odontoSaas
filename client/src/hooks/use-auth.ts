import { useState, useEffect } from "react";
import { authApi, type User } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = authApi.getToken();
    const userData = authApi.getUser();
    
    if (token && userData) {
      setUser(userData);
      setIsAuthenticated(true);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password);
      authApi.setAuth(response.token, response.user);
      setUser(response.user);
      setIsAuthenticated(true);
      console.log("Login bem-sucedido, isAuthenticated:", true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setIsAuthenticated(false);
    // Força o redirecionamento para a página de login
    window.location.href = "/";
  };

  const register = async (userData: {
    username: string;
    password: string;
    name: string;
    email: string;
    role: string;
  }) => {
    try {
      const response = await authApi.register(userData);
      authApi.setAuth(response.token, response.user);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
  };
}
