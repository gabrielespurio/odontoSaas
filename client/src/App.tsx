import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { authApi } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import PatientDetail from "@/pages/patient-detail";
import Schedule from "@/pages/schedule";
import Consultations from "@/pages/consultations-simple";
import Procedures from "@/pages/procedures";
import Financial from "@/pages/financial";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import MainLayout from "@/components/layout/main-layout";
import NotFound from "@/pages/not-found";





function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirecionar automaticamente para dashboard se autenticado e na página de login
  useEffect(() => {
    if (isAuthenticated && (location === "/login" || location === "/")) {
      console.log("Redirecionando para dashboard...");
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated, location, setLocation]);

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
        <Route path="/settings" component={Settings} />
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
