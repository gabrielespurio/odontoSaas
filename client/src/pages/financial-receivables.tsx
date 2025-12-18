import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  DollarSign, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Eye,
  Edit,
  CreditCard,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCompanyFilter } from "@/contexts/company-context";
import ReceivableForm from "@/components/financial/receivable-form";
import PaymentForm from "@/components/financial/payment-form";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/use-pagination";

type Receivable = {
  id: number;
  patientId: number;
  consultationId?: number;
  appointmentId?: number;
  amount: string;
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  description?: string;
  installments: number;
  installmentNumber: number;
  parentReceivableId?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: number;
    name: string;
    email?: string;
    phone: string;
  };
  consultation?: {
    id: number;
    date: string;
    attendanceNumber: string;
  };
  appointment?: {
    id: number;
    scheduledDate: string;
  };
  consultationDentistId?: number;
  appointmentDentistId?: number;
};

type Patient = {
  id: number;
  name: string;
  email?: string;
  phone: string;
};

export default function FinancialReceivables() {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDentist, setSelectedDentist] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null);
  const [payingReceivable, setPayingReceivable] = useState<Receivable | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId: companyFilter } = useCompanyFilter();

  const { data: receivables, isLoading: receivablesLoading } = useQuery<Receivable[]>({
    queryKey: ["/api/receivables", {
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      dentistId: selectedDentist !== "all" ? parseInt(selectedDentist) : undefined,
      companyId: companyFilter
    }],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      
      if (selectedStatus !== "all") {
        params.append('status', selectedStatus);
      }
      
      if (selectedDentist !== "all") {
        params.append('dentistId', selectedDentist);
      }
      
      if (companyFilter.companyId) {
        params.append('companyId', companyFilter.toString());
      }
      
      const url = `/api/receivables${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { companyId: companyFilter }],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      
      if (companyFilter.companyId) {
        params.append('companyId', companyFilter.toString());
      }
      
      const url = `/api/patients${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const { data: dentists } = useQuery<any[]>({
    queryKey: ["/api/users/dentists", { companyId: companyFilter }],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      
      if (companyFilter.companyId) {
        params.append('companyId', companyFilter.toString());
      }
      
      const url = `/api/users/dentists${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: ({ id, paymentData }: { id: number; paymentData: any }) => 
      apiRequest("PUT", `/api/receivables/${id}`, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receivables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-metrics"] });
      toast({
        title: "Sucesso",
        description: "Recebimento registrado com sucesso",
      });
      setPayingReceivable(null);
      setShowPaymentForm(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao registrar recebimento",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = status === "pending" && new Date(dueDate + 'T00:00:00') < new Date();
    const actualStatus = isOverdue ? "overdue" : status;
    
    const statusMap = {
      paid: { label: "Pago", className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
      overdue: { label: "Vencido", className: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
      cancelled: { label: "Cancelado", className: "bg-gray-100 text-gray-800 border-gray-200", icon: AlertTriangle },
    };
    
    const statusInfo = statusMap[actualStatus as keyof typeof statusMap];
    if (!statusInfo) return null;

    const Icon = statusInfo.icon;
    return (
      <Badge className={`${statusInfo.className} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: string) => {
    return `R$ ${Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    // Forçar interpretação como data local para evitar conversão de timezone
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const filteredReceivables = receivables?.filter(receivable => {
    if (!receivable) return false;
    const matchesSearch = search === "" || 
      receivable.patient.name.toLowerCase().includes(search.toLowerCase()) ||
      receivable.description?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  }) || [];

  // Paginação
  const pagination = usePagination({
    data: filteredReceivables,
    itemsPerPage: 10,
  });

  const handlePayment = (receivable: Receivable) => {
    setPayingReceivable(receivable);
    setShowPaymentForm(true);
  };

  const handleEdit = (receivable: Receivable) => {
    setEditingReceivable(receivable);
    setShowForm(true);
  };

  const handleDelete = async (receivable: Receivable) => {
    if (window.confirm(`Tem certeza que deseja excluir esta conta a receber de ${receivable.patient.name}?`)) {
      try {
        await apiRequest(`/api/receivables/${receivable.id}`, {
          method: "DELETE",
        });
        
        toast({
          title: "Sucesso",
          description: "Conta a receber excluída com sucesso.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/receivables"] });
        queryClient.invalidateQueries({ queryKey: ["/api/financial-metrics"] });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir conta a receber.",
          variant: "destructive",
        });
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingReceivable(null);
    queryClient.invalidateQueries({ queryKey: ["/api/receivables"] });
    queryClient.invalidateQueries({ queryKey: ["/api/financial-metrics"] });
  };

  const totalPending = filteredReceivables
    .filter(r => r.status === "pending" || (r.status === "pending" && new Date(r.dueDate) < new Date()))
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalReceived = filteredReceivables
    .filter(r => r.status === "paid")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalOverdue = filteredReceivables
    .filter(r => r.status === "pending" && new Date(r.dueDate) < new Date())
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="page-container">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contas a Receber</h1>
            <p className="text-gray-600">Gerencie os recebimentos de pacientes</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingReceivable(null)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nova Conta a Receber
              </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-4xl w-full">
              <DialogHeader>
                <DialogTitle>
                  {editingReceivable ? "Editar Conta a Receber" : "Nova Conta a Receber"}
                </DialogTitle>
              </DialogHeader>
              <ReceivableForm 
                receivable={editingReceivable}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">A Receber</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPending.toString())}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Recebido</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(totalReceived.toString())}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vencido</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(totalOverdue.toString())}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency((totalPending + totalReceived).toString())}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por paciente ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedDentist} onValueChange={setSelectedDentist}>
                <SelectTrigger>
                  <SelectValue placeholder="Dentista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Dentistas</SelectItem>
                  {dentists?.map((dentist) => (
                    <SelectItem key={dentist.id} value={dentist.id.toString()}>
                      {dentist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={() => {
                setSearch("");
                setSelectedStatus("all");
                setSelectedDentist("all");
              }} className="w-full md:w-auto">
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contas a Receber - Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Contas a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            {receivablesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-12 bg-gray-300 rounded mb-2"></div>
                  </div>
                ))}
              </div>
            ) : filteredReceivables.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma conta a receber encontrada
                </h3>
                <p className="text-gray-600">
                  Crie uma nova conta a receber para começar.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identificador</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Dentista</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.currentData.map((receivable) => {
                      const dentist = dentists?.find(d => 
                        d.id === receivable.consultationDentistId || 
                        d.id === receivable.appointmentDentistId
                      );
                      
                      return (
                        <TableRow key={receivable.id}>
                          <TableCell>
                            {receivable.consultation ? (
                              <Badge variant="outline" className="text-xs bg-teal-50 border-teal-200 text-teal-700">
                                {receivable.consultation.attendanceNumber}
                              </Badge>
                            ) : receivable.appointmentId ? (
                              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                                AG-{receivable.appointmentId}
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-gray-900">
                              {receivable.patient.name}
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            <span className="text-sm font-medium text-gray-900">
                              {dentist?.name || "Não identificado"}
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(receivable.amount)}
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {formatDate(receivable.dueDate)}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {getStatusBadge(receivable.status, receivable.dueDate)}
                          </TableCell>
                          
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {receivable.installments > 1 
                                ? `${receivable.installmentNumber}/${receivable.installments}`
                                : "Única"
                              }
                            </span>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(receivable)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                {receivable.status === "pending" && (
                                  <DropdownMenuItem onClick={() => handlePayment(receivable)}>
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Receber
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(receivable)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Paginação */}
            {filteredReceivables.length > 0 && (
              <div className="px-6 pb-6">
                <TablePagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={pagination.goToPage}
                  canGoPrevious={pagination.canGoPrevious}
                  canGoNext={pagination.canGoNext}
                  startIndex={pagination.startIndex}
                  endIndex={pagination.endIndex}
                  totalItems={pagination.totalItems}
                />
              </div>
            )}
          </CardContent>
        </Card>


      </div>

      {/* Modal de Pagamento */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>
          {payingReceivable && (
            <PaymentForm
              receivable={payingReceivable}
              onSuccess={(paymentData) => {
                markAsPaidMutation.mutate({
                  id: payingReceivable.id,
                  paymentData: {
                    ...paymentData,
                    status: "paid",
                  },
                });
              }}
              onCancel={() => setShowPaymentForm(false)}
              isLoading={markAsPaidMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}