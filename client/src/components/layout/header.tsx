import { useLocation } from "wouter";
import { Bell, Settings, Menu } from "lucide-react";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/patients": "Pacientes",
  "/schedule": "Agenda",
  "/consultations": "Atendimentos",
  "/procedures": "Procedimentos",
  "/financial": "Financeiro",
  "/reports": "Relatórios",
  "/settings": "Configurações",
};

export default function Header() {
  const [location] = useLocation();
  const pageName = pageNames[location] || "DentalCare";

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <button className="lg:hidden text-neutral-600 hover:text-neutral-900 mr-2">
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-semibold text-neutral-900">{pageName}</h2>
        </div>
        <div className="flex items-center space-x-4">
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
