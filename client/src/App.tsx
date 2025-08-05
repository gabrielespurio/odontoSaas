import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useTokenCleanup } from "@/hooks/use-token-cleanup";
import { authApi } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";

import Login from "@/pages/login";
import ForceChangePassword from "@/pages/force-change-password";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import PatientDetail from "@/pages/patient-detail";
import Schedule from "@/pages/schedule";
import Consultations from "@/pages/consultations";
import Procedures from "@/pages/procedures";
import Financial from "@/pages/financial";
import FinancialReceivables from "@/pages/financial-receivables";
import FinancialPayables from "@/pages/financial-payables";
import FinancialCashFlow from "@/pages/financial-cashflow";
import Suppliers from "@/pages/Suppliers";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Receivings from "@/pages/Receivings";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Companies from "@/pages/companies";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import { CompanyProvider } from "@/contexts/company-context";





function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Clean up expired tokens automatically
  useTokenCleanup();

  // Check if user needs to change password
  const needsPasswordChange = isAuthenticated && user?.forcePasswordChange;

  // Redirecionar automaticamente para dashboard se autenticado e na página de login
  useEffect(() => {
    if (isAuthenticated && !needsPasswordChange && (location === "/login" || location === "/")) {
      console.log("Redirecionando para dashboard...");
      setLocation("/dashboard");
    }
  }, [isAuthenticated, needsPasswordChange, location, setLocation]);

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

  // Force password change if required
  if (needsPasswordChange) {
    return <ForceChangePassword />;
  }

  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={() => <ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard" component={() => <ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/patients" component={() => <ProtectedRoute module="patients"><Patients /></ProtectedRoute>} />
        <Route path="/patients/:id" component={() => <ProtectedRoute module="patients"><PatientDetail /></ProtectedRoute>} />
        <Route path="/schedule" component={() => <ProtectedRoute module="schedule"><Schedule /></ProtectedRoute>} />
        <Route path="/consultations" component={() => <ProtectedRoute module="consultations"><Consultations /></ProtectedRoute>} />
        <Route path="/procedures" component={() => <ProtectedRoute module="procedures"><Procedures /></ProtectedRoute>} />
        <Route path="/financial" component={() => <ProtectedRoute module="financial"><Financial /></ProtectedRoute>} />
        <Route path="/financial/receivables" component={() => <ProtectedRoute module="financial"><FinancialReceivables /></ProtectedRoute>} />
        <Route path="/financial/payables" component={() => <ProtectedRoute module="financial"><FinancialPayables /></ProtectedRoute>} />
        <Route path="/financial/cashflow" component={() => <ProtectedRoute module="financial"><FinancialCashFlow /></ProtectedRoute>} />
        <Route path="/suppliers" component={() => <ProtectedRoute module="purchases"><Suppliers /></ProtectedRoute>} />
        <Route path="/purchase-orders" component={() => <ProtectedRoute module="purchases"><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/receivings" component={() => <ProtectedRoute module="purchases"><Receivings /></ProtectedRoute>} />
        <Route path="/reports" component={() => <ProtectedRoute module="reports"><Reports /></ProtectedRoute>} />
        <Route path="/settings" component={() => <ProtectedRoute module="settings"><Settings /></ProtectedRoute>} />
        <Route path="/companies" component={() => <ProtectedRoute module="companies"><Companies /></ProtectedRoute>} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CompanyProvider>
          <Toaster />
          <Router />
        </CompanyProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
