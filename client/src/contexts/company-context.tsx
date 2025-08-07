import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Company {
  id: number;
  name: string;
  tradeName?: string;
  email: string;
  phone: string;
  isActive: boolean;
}

interface CompanyContextType {
  selectedCompanyId: number | null;
  setSelectedCompanyId: (companyId: number | null) => void;
  companies: Company[];
  isSystemAdmin: boolean;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

interface CompanyProviderProps {
  children: ReactNode;
}

export function CompanyProvider({ children }: CompanyProviderProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  // Verificar se é superadmin
  const { data: userCompany } = useQuery<{ isSystemAdmin?: boolean; companyName?: string; tradeName?: string }>({
    queryKey: ["/api/user/company"],
    enabled: !!localStorage.getItem("token"),
    staleTime: 5 * 60 * 1000,
  });

  const isSystemAdmin = userCompany?.isSystemAdmin === true;

  // Buscar todas as empresas (apenas para superadmin)
  const { data: companiesData, isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: isSystemAdmin,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const companies = companiesData || [];

  // Salvar a empresa selecionada no localStorage
  useEffect(() => {
    if (selectedCompanyId !== null) {
      localStorage.setItem('selectedCompanyId', selectedCompanyId.toString());
    } else {
      localStorage.removeItem('selectedCompanyId');
    }
  }, [selectedCompanyId]);

  // Carregar a empresa selecionada do localStorage na inicialização
  useEffect(() => {
    if (isSystemAdmin && companies.length > 0) {
      const savedCompanyId = localStorage.getItem('selectedCompanyId');
      if (savedCompanyId) {
        const companyId = parseInt(savedCompanyId);
        const companyExists = companies.find(c => c.id === companyId);
        if (companyExists) {
          setSelectedCompanyId(companyId);
        } else {
          // Se a empresa salva não existe mais, limpar
          localStorage.removeItem('selectedCompanyId');
        }
      }
    }
  }, [isSystemAdmin, companies]);

  return (
    <CompanyContext.Provider value={{
      selectedCompanyId,
      setSelectedCompanyId,
      companies,
      isSystemAdmin,
      isLoading
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
}

// Hook para obter o filtro de empresa atual para APIs
export function useCompanyFilter() {
  const { selectedCompanyId, isSystemAdmin } = useCompanyContext();
  
  // Se for superadmin e tiver empresa selecionada, filtrar por ela
  // Se não for superadmin, o backend já filtra automaticamente pela empresa do usuário
  return {
    companyId: isSystemAdmin && selectedCompanyId ? selectedCompanyId : undefined,
    isSystemAdmin,
    selectedCompanyId
  };
}