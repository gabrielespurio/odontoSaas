import { useLocation } from "wouter";
import { Bell, Settings, Menu, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/patients": "Pacientes",
  "/schedule": "Agenda",
  "/consultations": "Atendimentos",
  "/procedures": "Procedimentos",
  "/financial": "Financeiro",
  "/financial/receivables": "Contas a Receber",
  "/financial/payables": "Contas a Pagar", 
  "/financial/cashflow": "Fluxo de Caixa",
  "/reports": "Relatórios",
  "/settings": "Configurações",
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [location] = useLocation();
  const currentPageName = pageNames[location] || "OdontoSync";

  const { data: userCompany } = useQuery({
    queryKey: ["/api/user/company"],
    enabled: !!localStorage.getItem("token"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        <div className="flex items-center">
          <button 
            onClick={onMenuClick}
            className="lg:hidden text-neutral-600 hover:text-neutral-900 mr-3 p-2"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-neutral-900 lg:hidden">
            {currentPageName}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Company Name Display */}
          {userCompany && (
            <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-200">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-teal-700">
                {userCompany.tradeName || userCompany.companyName}
              </span>
            </div>
          )}
          
          <button className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
