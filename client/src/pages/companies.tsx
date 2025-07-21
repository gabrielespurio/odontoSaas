import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Users, CreditCard, Calendar, Phone, Mail, MapPin, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CompanyForm } from "@/components/companies/company-form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Company {
  id: number;
  name: string;
  tradeName?: string;
  cnpj?: string;
  email: string;
  phone: string;
  responsibleName: string;
  responsiblePhone: string;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  planType: string;
  maxUsers: number;
  maxPatients: number;
  isActive: boolean;
  trialEndDate?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface CompanyWithAdmin {
  company: Company;
  adminUser: {
    id: number;
    username: string;
    name: string;
    email: string;
    generatedPassword: string;
  };
}

export default function Companies() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<CompanyWithAdmin | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar empresa");
      }
      
      return response.json();
    },
    onSuccess: (data: CompanyWithAdmin) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsCreateDialogOpen(false);
      setCreatedAdmin(data);
      setIsSuccessDialogOpen(true);
      toast({
        title: "Empresa criada com sucesso!",
        description: `Admin criado: ${data.adminUser.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar empresa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Não definido";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const getStatusBadge = (company: Company) => {
    if (!company.isActive) {
      return <Badge variant="destructive">Inativo</Badge>;
    }
    
    const today = new Date();
    const trialEnd = company.trialEndDate ? new Date(company.trialEndDate) : null;
    const subscriptionEnd = company.subscriptionEndDate ? new Date(company.subscriptionEndDate) : null;
    
    if (trialEnd && trialEnd > today) {
      return <Badge variant="secondary">Trial</Badge>;
    }
    
    if (subscriptionEnd && subscriptionEnd > today) {
      return <Badge variant="default">Ativo</Badge>;
    }
    
    return <Badge variant="outline">Período expirado</Badge>;
  };

  if (isLoading) {
    return <div className="p-6">Carregando empresas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">
            Gerencie as empresas cadastradas no sistema
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Empresa</DialogTitle>
            </DialogHeader>
            <CompanyForm 
              onSubmit={(data) => createCompanyMutation.mutate(data)}
              isLoading={createCompanyMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company: Company) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                </div>
                {getStatusBadge(company)}
              </div>
              {company.tradeName && (
                <p className="text-sm text-muted-foreground">{company.tradeName}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{company.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{company.phone}</span>
                </div>
                {company.city && company.state && (
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{company.city}, {company.state}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{company.maxUsers}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Max Usuários</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold capitalize">{company.planType}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Plano</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCompany(company);
                    setIsViewDialogOpen(true);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Company Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Empresa</DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Informações Básicas</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nome:</strong> {selectedCompany.name}</p>
                    {selectedCompany.tradeName && <p><strong>Nome Fantasia:</strong> {selectedCompany.tradeName}</p>}
                    {selectedCompany.cnpj && <p><strong>CNPJ:</strong> {selectedCompany.cnpj}</p>}
                    <p><strong>Email:</strong> {selectedCompany.email}</p>
                    <p><strong>Telefone:</strong> {selectedCompany.phone}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Responsável</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nome:</strong> {selectedCompany.responsibleName}</p>
                    <p><strong>Telefone:</strong> {selectedCompany.responsiblePhone}</p>
                  </div>
                </div>
              </div>

              {(selectedCompany.street || selectedCompany.city) && (
                <div>
                  <h3 className="font-semibold mb-2">Endereço</h3>
                  <div className="space-y-2 text-sm">
                    {selectedCompany.cep && <p><strong>CEP:</strong> {selectedCompany.cep}</p>}
                    {selectedCompany.street && (
                      <p><strong>Endereço:</strong> {selectedCompany.street}
                        {selectedCompany.number && `, ${selectedCompany.number}`}
                      </p>
                    )}
                    {selectedCompany.neighborhood && <p><strong>Bairro:</strong> {selectedCompany.neighborhood}</p>}
                    {selectedCompany.city && (
                      <p><strong>Cidade:</strong> {selectedCompany.city}
                        {selectedCompany.state && `, ${selectedCompany.state}`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Limites</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Máx. Usuários:</strong> {selectedCompany.maxUsers}</p>
                    <p><strong>Máx. Pacientes:</strong> {selectedCompany.maxPatients}</p>
                    <p><strong>Plano:</strong> {selectedCompany.planType}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Datas</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Fim do Trial:</strong> {formatDate(selectedCompany.trialEndDate)}</p>
                    <p><strong>Início Assinatura:</strong> {formatDate(selectedCompany.subscriptionStartDate)}</p>
                    <p><strong>Fim Assinatura:</strong> {formatDate(selectedCompany.subscriptionEndDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog with Admin Credentials */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Empresa Criada com Sucesso!</DialogTitle>
          </DialogHeader>
          {createdAdmin && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Usuário Admin Criado</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Usuário:</strong> {createdAdmin.adminUser.username}</p>
                  <p><strong>Senha Temporária:</strong> {createdAdmin.adminUser.generatedPassword}</p>
                  <p><strong>Email:</strong> {createdAdmin.adminUser.email}</p>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Importante:</strong> O usuário admin será forçado a alterar a senha no primeiro login.
                  Anote estas credenciais e repasse para o responsável da empresa.
                </p>
              </div>

              <Button 
                onClick={() => setIsSuccessDialogOpen(false)}
                className="w-full"
              >
                Entendido
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}