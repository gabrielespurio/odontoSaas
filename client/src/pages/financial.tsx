import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Eye,
  CheckCircle,
  User,
  Calendar
} from "lucide-react";
import PaymentForm from "@/components/financial/payment-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Financial, Patient } from "@/lib/types";

export default function Financial() {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPatient, setSelectedPatient] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Financial | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: financialRecords, isLoading: financialLoading } = useQuery<Financial[]>({
    queryKey: ["/api/financial", {
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      patientId: selectedPatient !== "all" ? parseInt(selectedPatient) : undefined
    }],
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const markAsPaidMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/financial/${id}`, {
      status: "paid",
      paymentDate: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial"] });
      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao registrar pagamento",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      paid: { label: "Pago", className: "financial-paid", icon: CheckCircle },
      pending: { label: "Pendente", className: "financial-pending", icon: Clock },
      overdue: { label: "Vencido", className: "financial-overdue", icon: AlertTriangle },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap];
    if (!statusInfo) return null;

    const Icon = statusInfo.icon;
    return (
      <Badge className={`status-badge ${statusInfo.className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: string) => {
    return `R$ ${Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status === "pending" && new Date(dueDate) < new Date();
  };

  const filteredRecords = financialRecords?.filter(record => 
    (!search || 
     record.patient?.name.toLowerCase().includes(search.toLowerCase()) ||
     record.description?.toLowerCase().includes(search.toLowerCase())
    )
  );

  // Calculate summary statistics
  const summary = filteredRecords?.reduce((acc, record) => {
    const amount = Number(record.amount);
    if (record.status === "paid") {
      acc.received += amount;
    } else if (record.status === "pending") {
      acc.pending += amount;
    } else if (record.status === "overdue") {
      acc.overdue += amount;
    }
    return acc;
  }, { received: 0, pending: 0, overdue: 0 });

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPayment(null);
  };

  const handleMarkAsPaid = (payment: Financial) => {
    if (confirm(`Confirmar pagamento de ${formatCurrency(payment.amount)} de ${payment.patient?.name}?`)) {
      markAsPaidMutation.mutate(payment.id);
    }
  };

  if (financialLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Financeiro</h1>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPayment(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Pagamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPayment ? "Editar Pagamento" : "Novo Pagamento"}
              </DialogTitle>
            </DialogHeader>
            <PaymentForm
              payment={editingPayment}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Recebido Este Mês</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary?.received.toString() || "0")}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="text-green-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Contas a Receber</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(summary?.pending.toString() || "0")}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="text-yellow-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Vencidas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary?.overdue.toString() || "0")}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Buscar por paciente ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filtrar por paciente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Pacientes</SelectItem>
                {patients?.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id.toString()}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentação Financeira</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">Paciente</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">Descrição</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">Valor</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">Vencimento</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords?.map((record) => (
                  <tr 
                    key={record.id} 
                    className={`border-b hover:bg-neutral-50 ${
                      isOverdue(record.dueDate, record.status) ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(record.patient?.name || "")}
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-neutral-900">{record.patient?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-neutral-900">{record.description}</td>
                    <td className="py-4 px-4 font-semibold text-neutral-900">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="py-4 px-4 text-neutral-900">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-neutral-400" />
                        {formatDate(record.dueDate)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {record.status === "pending" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMarkAsPaid(record)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {(!filteredRecords || filteredRecords.length === 0) && (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600">Nenhum registro financeiro encontrado</p>
              <p className="text-sm text-neutral-500 mt-2">
                {search ? "Tente ajustar os filtros de busca" : "Registre o primeiro pagamento"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
