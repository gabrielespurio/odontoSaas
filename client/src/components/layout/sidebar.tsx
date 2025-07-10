import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Stethoscope, 
  Wrench, 
  DollarSign, 
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import odontoSyncLogo from "@assets/ChatGPT_Image_10_de_jul._de_2025__12_09_27-removebg-preview_1752160369330.png";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Pacientes", href: "/patients", icon: Users },
  { name: "Agenda", href: "/schedule", icon: Calendar },
  { name: "Atendimentos", href: "/consultations", icon: Stethoscope },
  { name: "Procedimentos", href: "/procedures", icon: Wrench },
  { 
    name: "Financeiro", 
    href: "/financial", 
    icon: DollarSign,
    submenus: [
      { name: "Contas a Receber", href: "/financial/receivables" },
      { name: "Contas a Pagar", href: "/financial/payables" },
      { name: "Fluxo de Caixa", href: "/financial/cash-flow" },
    ]
  },
  { name: "Relatórios", href: "/reports", icon: FileText },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  // Check if any financial submenu is active
  const isFinanceActive = location === "/financial" || location.startsWith("/financial/");

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64 bg-white border-r border-neutral-200">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-6 border-b border-neutral-200">
          <div className="flex items-center space-x-2">
            <img 
              src={odontoSyncLogo} 
              alt="OdontoSync" 
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-xl font-bold text-neutral-900">OdontoSync</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            // Se o item tem submenus, renderizar de forma diferente
            if (item.submenus) {
              const ChevronIcon = isFinanceOpen ? ChevronDown : ChevronRight;
              
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => setIsFinanceOpen(!isFinanceOpen)}
                    className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isFinanceActive
                        ? "text-white bg-primary"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </div>
                    <ChevronIcon className="w-4 h-4" />
                  </button>
                  
                  {isFinanceOpen && (
                    <div className="ml-6 space-y-1">
                      {item.submenus.map((submenu) => {
                        const isSubmenuActive = location === submenu.href;
                        return (
                          <Link key={submenu.name} href={submenu.href}>
                            <div
                              className={`flex items-center px-4 py-1 text-sm rounded-lg transition-colors cursor-pointer ${
                                isSubmenuActive
                                  ? "text-primary bg-primary/10 font-medium"
                                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                              }`}
                            >
                              {submenu.name}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? "text-white bg-primary"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="px-4 py-4 border-t border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-neutral-900">{user?.name}</p>
                <p className="text-xs text-neutral-600 capitalize">{user?.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
