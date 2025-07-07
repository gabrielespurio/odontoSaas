import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Stethoscope, 
  Wrench, 
  DollarSign, 
  FileText,
  LogOut 
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Pacientes", href: "/patients", icon: Users },
  { name: "Agenda", href: "/schedule", icon: Calendar },
  { name: "Atendimentos", href: "/consultations", icon: Stethoscope },
  { name: "Procedimentos", href: "/procedures", icon: Wrench },
  { name: "Financeiro", href: "/financial", icon: DollarSign },
  { name: "Relatórios", href: "/reports", icon: FileText },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64 bg-white border-r border-neutral-200">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-6 bg-primary">
          <h1 className="text-xl font-bold text-white">DentalCare</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
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
              onClick={logout}
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
