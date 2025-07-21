import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Search, MoreVertical, Pencil, Trash2, Users, Calendar } from "lucide-react";
import type { Company } from "@shared/schema";
import CompanyForm from "@/components/companies/company-form";

export default function Companies() {
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading, error } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/companies/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Empresa excluída",
        description: "A empresa foi excluída com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir empresa",
        description: error.message || "Ocorreu um erro ao excluir a empresa.",
      });
    },
  });

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(search.toLowerCase()) ||
    company.email.toLowerCase().includes(search.toLowerCase()) ||
    (company.cnpj && company.cnpj.includes(search))
  );

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setShowEditDialog(true);
  };

  const handleDelete = async (company: Company) => {
    if (confirm(`Tem certeza que deseja excluir a empresa "${company.name}"?`)) {
      deleteMutation.mutate(company.id);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getPlanBadge = (planType: string) => {
    const colors = {
      basic: "bg-blue-100 text-blue-800",
      professional: "bg-green-100 text-green-800",
      enterprise: "bg-purple-100 text-purple-800",
    };
    return colors[planType as keyof typeof colors] || colors.basic;
  };

  if (error) {
    return (
      <div className="page-container">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Erro ao carregar empresas. Verifique suas permissões.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Building2 className="h-6 w-6 text-teal-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Gerenciar Empresas
          </h1>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar empresas por nome, email ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-500">
              {filteredCompanies.length} de {companies.length} empresas
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Usuários/Pacientes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Criação</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        {companies.length === 0 ? "Nenhuma empresa cadastrada" : "Nenhuma empresa encontrada"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {company.name}
                            </div>
                            {company.tradeName && (
                              <div className="text-sm text-gray-500">
                                {company.tradeName}
                              </div>
                            )}
                            {company.cnpj && (
                              <div className="text-xs text-gray-400">
                                CNPJ: {company.cnpj}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{company.email}</div>
                            <div className="text-gray-500">{company.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPlanBadge(company.planType)}>
                            {company.planType.charAt(0).toUpperCase() + company.planType.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {company.maxUsers} usuários
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Calendar className="w-3 h-3 mr-1" />
                              {company.maxPatients} pacientes
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={company.isActive ? "default" : "destructive"}>
                            {company.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(company.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(company)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(company)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
            <DialogDescription>
              Crie uma nova empresa no sistema.
            </DialogDescription>
          </DialogHeader>
          <CompanyForm
            onSuccess={() => {
              setShowCreateDialog(false);
              queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>
              Edite as informações da empresa.
            </DialogDescription>
          </DialogHeader>
          <CompanyForm
            company={selectedCompany}
            onSuccess={() => {
              setShowEditDialog(false);
              setSelectedCompany(null);
              queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
            }}
            onCancel={() => {
              setShowEditDialog(false);
              setSelectedCompany(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}