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
  Clock, 
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Eye,
  Edit,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ReceivableForm from "@/components/financial/receivable-form";
import PaymentForm from "@/components/financial/payment-form";

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
  };
  appointment?: {
    id: number;
    scheduledDate: string;
  };
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
  const [selectedPatient, setSelectedPatient] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null);
  const [payingReceivable, setPayingReceivable] = useState<Receivable | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: receivables, isLoading: receivablesLoading } = useQuery<Receivable[]>({
    queryKey: ["/api/receivables", {
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      patientId: selectedPatient !== "all" ? parseInt(selectedPatient) : undefined
    }],
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
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
    const isOverdue = status === "pending" && new Date(dueDate) < new Date();
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
    return new Date(date).toLocaleDateString('pt-BR');
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

  const handlePayment = (receivable: Receivable) => {
    setPayingReceivable(receivable);
    setShowPaymentForm(true);
  };

  const handleEdit = (receivable: Receivable) => {
    setEditingReceivable(receivable);
    setShowForm(true);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contas a Receber</h1>
            <p className="text-gray-600">Gerencie os recebimentos de pacientes</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingReceivable(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Conta a Receber
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="relative">
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
              
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Paciente" />
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
              
              <Button variant="outline" onClick={() => {
                setSearch("");
                setSelectedStatus("all");
                setSelectedPatient("all");
              }}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Contas a Receber */}
        <Card>
          <CardHeader>
            <CardTitle>Contas a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            {receivablesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredReceivables.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma conta a receber encontrada
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReceivables.map((receivable) => (
                  <div key={receivable.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(receivable.patient.name)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{receivable.patient.name}</h4>
                          <p className="text-sm text-gray-600">{receivable.description}</p>
                          {receivable.installments > 1 && (
                            <p className="text-xs text-gray-500">
                              Parcela {receivable.installmentNumber}/{receivable.installments}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{formatCurrency(receivable.amount)}</p>
                          <p className="text-sm text-gray-600">Venc: {formatDate(receivable.dueDate)}</p>
                          {receivable.paymentDate && (
                            <p className="text-sm text-green-600">Pago: {formatDate(receivable.paymentDate)}</p>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2">
                          {getStatusBadge(receivable.status, receivable.dueDate)}
                          
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(receivable)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            
                            {receivable.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => handlePayment(receivable)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CreditCard className="w-3 h-3 mr-1" />
                                Receber
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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