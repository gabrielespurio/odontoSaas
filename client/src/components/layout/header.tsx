import { useLocation } from "wouter";
import { Bell, Settings, Menu, Building2, ChevronDown, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyContext } from "@/contexts/company-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  "/suppliers": "Fornecedores",
  "/purchase-orders": "Pedidos de Compra",
  "/receivings": "Recebimentos",
  "/stock": "Estoque",
  "/stock/categories": "Categorias de Produtos",
  "/stock/products": "Produtos",
  "/reports": "Relatórios",
  "/settings": "Configurações",
  "/companies": "Empresas",
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

  const { 
    selectedCompanyId, 
    setSelectedCompanyId, 
    companies, 
    isSystemAdmin 
  } = useCompanyContext();

  // Encontrar a empresa selecionada
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  
  // Para display: se for superadmin e tiver empresa selecionada, mostrar ela
  // Senão, mostrar o nome da empresa do usuário normal
  const displayCompany = isSystemAdmin && selectedCompany 
    ? selectedCompany 
    : userCompany;

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
          {/* Company Selector for System Admin or Company Display */}
          {displayCompany && (
            <>
              {isSystemAdmin ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-teal-50 hover:bg-teal-100 border-teal-200 hover:border-teal-300"
                      data-testid="company-selector"
                    >
                      <Building2 className="w-4 h-4 text-teal-600" />
                      <span className="text-sm font-medium text-teal-700">
                        {selectedCompany 
                          ? (selectedCompany.tradeName || selectedCompany.name)
                          : "Selecionar Empresa"
                        }
                      </span>
                      <ChevronDown className="w-3 h-3 text-teal-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Selecionar Empresa
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    
                    {companies.length > 0 ? (
                      <>
                        <DropdownMenuItem
                          onClick={() => setSelectedCompanyId(null)}
                          className="flex items-center justify-between py-2"
                          data-testid="company-option-all"
                        >
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">Todas as Empresas</span>
                          </div>
                          {selectedCompanyId === null && (
                            <Check className="w-4 h-4 text-teal-600" />
                          )}
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {companies.map((company) => (
                          <DropdownMenuItem
                            key={company.id}
                            onClick={() => setSelectedCompanyId(company.id)}
                            className="flex items-center justify-between py-2"
                            data-testid={`company-option-${company.id}`}
                          >
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center space-x-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium">
                                  {company.tradeName || company.name}
                                </span>
                                {!company.isActive && (
                                  <Badge variant="secondary" className="text-xs">
                                    Inativa
                                  </Badge>
                                )}
                              </div>
                              {company.tradeName && company.name !== company.tradeName && (
                                <span className="text-xs text-gray-500 ml-6">
                                  {company.name}
                                </span>
                              )}
                            </div>
                            {selectedCompanyId === company.id && (
                              <Check className="w-4 h-4 text-teal-600" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </>
                    ) : (
                      <div className="px-2 py-2 text-sm text-gray-500">
                        Nenhuma empresa encontrada
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-200">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-medium text-teal-700">
                    {(displayCompany as any)?.tradeName || (displayCompany as any)?.companyName}
                  </span>
                </div>
              )}
            </>
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
