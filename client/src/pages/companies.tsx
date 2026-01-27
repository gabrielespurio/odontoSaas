import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { handleProductionError } from "@/config/production";
import { productionApi } from "@/utils/production-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Plus, Phone, Mail, MapPin, Eye, MoreHorizontal, Edit, Users, Trash2 } from "lucide-react";
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
  plan?: "Starter" | "Premium" | "Personalizado" | null;
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
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<CompanyWithAdmin | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load users when dialog opens and company changes
  useEffect(() => {
    if (isFormDialogOpen && selectedCompany) {
      loadCompanyUsers();
    }
  }, [isFormDialogOpen, selectedCompany?.id]);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading, error } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      try {
        console.log("🏢 Fetching companies...");
        const data = await productionApi.get<Company[]>("/api/companies");
        console.log("🏢 Companies fetched successfully:", data.length, "companies");
        return data;
      } catch (error) {
        console.error("🏢 Companies fetch error:", error);
        handleProductionError(error, 'companies-fetch');
        throw error;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Log para debug em produção
  useEffect(() => {
    if (error) {
      console.error("Companies loading error:", error);
      handleProductionError(error, 'companies-loading');
    }
    if (companies) {
      console.log("Companies loaded:", companies.length, "companies");
    }
  }, [companies, error]);

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
        description: `Admin criado: ${data.adminUser?.username || data.adminUser?.email || 'N/A'}`,
      });
    },
    onError: (error: Error) => {
      console.error("Create company error details:", error);
      toast({
        title: "Erro ao criar empresa",
        description: error.message || "Ocorreu um erro interno. Verifique se o CNPJ ou Email já estão cadastrados.",
        variant: "destructive",
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/companies/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar empresa");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsFormDialogOpen(false);
      toast({
        title: "Empresa atualizada com sucesso!",
        description: "Os dados da empresa foram atualizados.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar empresa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...userData,
          companyId: selectedCompany?.id,
          forcePasswordChange: true,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar usuário");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsCreateUserDialogOpen(false);
      loadCompanyUsers();
      toast({
        title: "Usuário criado com sucesso!",
        description: "O usuário foi adicionado à empresa.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loadCompanyUsers = async () => {
    if (!selectedCompany) return;
    
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem("token");
      console.log(`Loading users for company: ${selectedCompany.name} (ID: ${selectedCompany.id})`);
      
      const response = await fetch(`/api/users?companyId=${selectedCompany.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const users = await response.json();
        console.log(`Loaded ${users.length} users for company ${selectedCompany.id}:`, users);
        setCompanyUsers(users);
      } else {
        console.error("Failed to load users:", response.status, response.statusText);
        setCompanyUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setCompanyUsers([]);
    }
    setLoadingUsers(false);
  };

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
          <DialogContent className="!max-w-6xl w-full !max-h-[90vh] overflow-y-auto">
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company: Company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{company.name}</div>
                    {company.tradeName && (
                      <div className="text-sm text-muted-foreground">{company.tradeName}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{company.email}</TableCell>
                <TableCell>{company.phone}</TableCell>
                <TableCell>{company.responsibleName}</TableCell>
                <TableCell>
                  {company.city && company.state ? `${company.city}, ${company.state}` : "-"}
                </TableCell>
                <TableCell>
                  {getStatusBadge(company)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedCompany(company);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={async () => {
                          setSelectedCompany(company);
                          setCompanyUsers([]); // Clear previous users
                          setIsFormDialogOpen(true);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Company Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="!max-w-6xl w-full !max-h-[90vh] overflow-y-auto">
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

              <div>
                <h3 className="font-semibold mb-2">Datas</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Fim do Trial:</strong> {formatDate(selectedCompany.trialEndDate)}</p>
                  <p><strong>Início Assinatura:</strong> {formatDate(selectedCompany.subscriptionStartDate)}</p>
                  <p><strong>Fim Assinatura:</strong> {formatDate(selectedCompany.subscriptionEndDate)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-[90vw] w-[90vw] h-[95vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-xl font-semibold flex items-center gap-3">
              <Building2 className="h-6 w-6 text-teal-600" />
              Gerenciar Empresa - {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="company" className="h-full flex flex-col">
              <div className="px-6 py-3 border-b shrink-0">
                <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/30">
                  <TabsTrigger value="company" className="flex items-center gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:border-teal-200">
                    <Building2 className="h-4 w-4" />
                    Dados da Empresa
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:border-teal-200">
                    <Users className="h-4 w-4" />
                    Usuários Administrativos
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="company" className="flex-1 m-0 p-6 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Informações da Empresa</h3>
                    <p className="text-sm text-gray-600">Atualize os dados da empresa conforme necessário</p>
                  </div>
                  
                  <CompanyForm 
                    company={selectedCompany ? {
                      ...selectedCompany,
                      number: selectedCompany.number || null,
                      tradeName: selectedCompany.tradeName || null,
                      cnpj: selectedCompany.cnpj || null,
                      cep: selectedCompany.cep || null,
                      street: selectedCompany.street || null,
                      neighborhood: selectedCompany.neighborhood || null,
                      city: selectedCompany.city || null,
                      state: selectedCompany.state || null,
                      trialEndDate: selectedCompany.trialEndDate || null,
                      subscriptionStartDate: selectedCompany.subscriptionStartDate || null,
                      subscriptionEndDate: selectedCompany.subscriptionEndDate || null,
                      createdAt: new Date(selectedCompany.createdAt),
                      updatedAt: new Date(selectedCompany.updatedAt),
                      whatsappInstanceId: (selectedCompany as any).whatsappInstanceId || null,
                      whatsappHash: (selectedCompany as any).whatsappHash || null,
                      whatsappStatus: (selectedCompany as any).whatsappStatus || null,
                      whatsappQrCode: (selectedCompany as any).whatsappQrCode || null,
                      whatsappConnectedAt: (selectedCompany as any).whatsappConnectedAt ? new Date((selectedCompany as any).whatsappConnectedAt) : null,
                    } : null}
                    onSubmit={(data) => {
                      if (selectedCompany) {
                        updateCompanyMutation.mutate({ id: selectedCompany.id, data });
                      }
                    }}
                    isLoading={updateCompanyMutation.isPending}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="users" className="flex-1 m-0 p-6 overflow-hidden flex flex-col">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-100">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Usuários Administrativos</h3>
                      <p className="text-sm text-gray-600">
                        Gerencie os usuários que têm acesso administrativo a esta empresa
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {companyUsers.filter(u => !u.forcePasswordChange).length} Ativos
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          {companyUsers.filter(u => u.forcePasswordChange).length} Pendentes
                        </span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setIsCreateUserDialogOpen(true)}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Usuário Admin
                    </Button>
                  </div>

                  {loadingUsers ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                      <p className="text-gray-600">Carregando usuários...</p>
                    </div>
                  ) : (
                    <div className="flex-1 bg-white rounded-lg border shadow-sm overflow-hidden">
                      <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
                        <table className="w-full min-w-[800px]">
                          <thead className="bg-gray-50 border-b sticky top-0">
                            <tr>
                              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 w-1/3">Nome</th>
                              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 w-1/3">Email</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-24">Perfil</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">Status</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-16">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {companyUsers.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-6 py-16">
                                  <div className="flex flex-col items-center justify-center space-y-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                      <Users className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <div className="text-center">
                                      <p className="text-gray-900 font-medium">Nenhum usuário encontrado</p>
                                      <p className="text-gray-500 text-sm mt-1">
                                        Crie o primeiro usuário administrativo para esta empresa
                                      </p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              companyUsers.map((user, index) => (
                                <tr 
                                  key={user.id} 
                                  className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                >
                                  {/* Nome e Avatar */}
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-teal-700 font-semibold text-sm">
                                          {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-semibold text-gray-900" title={user.name}>{user.name}</p>
                                        <p className="text-xs text-gray-500">ID: {user.id}</p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Email */}
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-gray-700 text-sm" title={user.email}>{user.email}</span>
                                    </div>
                                  </td>

                                  {/* Perfil */}
                                  <td className="px-4 py-4 text-center">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      Admin
                                    </span>
                                  </td>

                                  {/* Status */}
                                  <td className="px-4 py-4 text-center">
                                    <Badge 
                                      variant={user.forcePasswordChange ? "secondary" : "default"}
                                      className={user.forcePasswordChange 
                                        ? "bg-yellow-100 text-yellow-800 border-yellow-200 text-xs" 
                                        : "bg-green-100 text-green-800 border-green-200 text-xs"
                                      }
                                    >
                                      {user.forcePasswordChange ? "Pendente" : "Ativo"}
                                    </Badge>
                                  </td>

                                  {/* Ações */}
                                  <td className="px-4 py-4 text-center">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem className="hover:bg-gray-50">
                                          <Edit className="mr-2 h-4 w-4 text-blue-600" />
                                          <span>Editar</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600 hover:bg-red-50">
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          <span>Remover</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog with Admin Credentials */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Empresa Criada com Sucesso!</DialogTitle>
          </DialogHeader>
          {createdAdmin && createdAdmin.adminUser && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Usuário Admin Criado</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Nome:</strong> {createdAdmin.adminUser.name || 'N/A'}</p>
                  <p><strong>Email:</strong> {createdAdmin.adminUser.email || 'N/A'}</p>
                  <p><strong>Senha Temporária:</strong> {createdAdmin.adminUser.generatedPassword || 'N/A'}</p>
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

      {/* Create User Dialog */}
      <CreateUserDialog 
        open={isCreateUserDialogOpen}
        onOpenChange={setIsCreateUserDialogOpen}
        onSubmit={(data) => createUserMutation.mutate(data)}
        isLoading={createUserMutation.isPending}
        companyName={selectedCompany?.name || ""}
      />
    </div>
  );
}

// User creation form schema
const createUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.string().min(1, "Perfil é obrigatório"),
  dataScope: z.enum(["all", "own"]).default("all"),
});

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  companyName: string;
}

function CreateUserDialog({ open, onOpenChange, onSubmit, isLoading, companyName }: CreateUserDialogProps) {
  const form = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "Administrador",
      dataScope: "all" as "all" | "own",
    },
  });

  const handleSubmit = (data: any) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Usuário Administrativo</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Criando usuário para: {companyName}
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha Temporária</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Administrador">Administrador</SelectItem>
                      <SelectItem value="Dentista">Dentista</SelectItem>
                      <SelectItem value="Recepção">Recepção</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataScope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Escopo de Dados</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o escopo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Todos os dados da clínica</SelectItem>
                      <SelectItem value="own">Apenas seus próprios dados</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Nota:</strong> O usuário será forçado a alterar a senha no primeiro login.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}