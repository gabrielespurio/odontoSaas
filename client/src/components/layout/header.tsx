import { useLocation } from "wouter";
import { Bell, Settings, Menu } from "lucide-react";

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
