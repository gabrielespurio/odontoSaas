import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { authApi } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import PatientDetail from "@/pages/patient-detail";
import Schedule from "@/pages/schedule";
import Consultations from "@/pages/consultations";
import Procedures from "@/pages/procedures";
import Financial from "@/pages/financial";
import Reports from "@/pages/reports";
import MainLayout from "@/components/layout/main-layout";
import NotFound from "@/pages/not-found";

// Override the default queryClient to add auth headers
queryClient.setDefaultOptions({
  queries: {
    queryFn: async ({ queryKey }) => {
      const token = authApi.getToken();
      const headers: Record<string, string> = {};
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers,
      });

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      
      return await res.json();
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: false,
  },
});

// Override apiRequest to add auth headers
const originalApiRequest = apiRequest;
(globalThis as any).apiRequest = async (method: string, url: string, data?: unknown) => {
  const token = authApi.getToken();
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  
  return res;
};

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/patients" component={Patients} />
        <Route path="/patients/:id" component={PatientDetail} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/consultations" component={Consultations} />
        <Route path="/procedures" component={Procedures} />
        <Route path="/financial" component={Financial} />
        <Route path="/reports" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
