import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { productionFetch, handleProductionError, PRODUCTION_CONFIG } from "@/config/production";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData;
    try {
      const text = await res.text();
      errorData = JSON.parse(text);
    } catch {
      errorData = { message: res.statusText };
    }
    
    // Handle token expiration - redirect to login
    if (res.status === 401 || res.status === 403) {
      console.log("Authentication error - redirecting to login:", res.status, errorData);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("selectedCompanyId");
      window.location.href = "/login";
      return;
    }
    
    const error = new Error(errorData.message || `HTTP ${res.status}`);
    (error as any).response = { data: errorData, status: res.status };
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await productionFetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await productionFetch(queryKey[0] as string, {
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && (res.status === 401 || res.status === 403)) {
      return null;
    }

    // Handle token expiration in queries
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
