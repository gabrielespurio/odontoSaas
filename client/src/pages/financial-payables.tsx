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
  Calendar,
  Eye,
  Edit,
  CreditCard,
  Building,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Payable = {
  id: number;
  amount: string;
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  description: string;
  category: string;
  supplier?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export default function FinancialPayables() {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payables, isLoading: payablesLoading } = useQuery<Payable[]>({
    queryKey: ["/api/payables", {
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined
    }],
  });

  const markAsPaidMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/payables/${id}`, {
      status: "paid",
      paymentDate: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payables"] });
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

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      paid: { label: "Pago", className: "financial-paid", icon: CheckCircle },
      pending: { label: "Pendente", className: "financial-pending", icon: Clock },
      overdue: { label: "Vencido", className: "financial-overdue", icon: AlertTriangle },
      cancelled: { label: "Cancelado", className: "status-cancelled", icon: AlertTriangle },
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

  const filteredPayables = payables?.filter(payable => {
    const matchesSearch = !search || 
      payable.description.toLowerCase().includes(search.toLowerCase()) ||
      payable.supplier?.toLowerCase().includes(search.toLowerCase()) ||
      payable.category.toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch;
  }) || [];

  const totalPending = filteredPayables
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalPaid = filteredPayables
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalOverdue = filteredPayables
    .filter(p => p.status === "overdue")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (payablesLoading) {
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
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Contas a Pagar</h1>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPayable(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta a Pagar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPayable ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-center text-neutral-600 py-8">
              Formulário de contas a pagar será implementado
            </p>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Pendente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(totalPending)}
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
                <p className="text-sm font-medium text-neutral-600">Total Pago</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Vencido</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalOverdue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Buscar por descrição, fornecedor ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="md:w-48">
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
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="equipamento">Equipamento</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
                <SelectItem value="aluguel">Aluguel</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payables Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas a Pagar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="responsive-table-container">
            <table className="responsive-table">
              <thead className="bg-neutral-50">
                <tr className="border-b">
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Descrição</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Fornecedor</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Categoria</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Valor</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Vencimento</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Status</th>
                  <th className="text-center py-4 px-6 font-medium text-neutral-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayables.map((payable) => (
                  <tr key={payable.id} className="border-b hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-neutral-900">{payable.description}</p>
                        {payable.notes && (
                          <p className="text-sm text-neutral-600">{payable.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <Building className="w-4 h-4 text-neutral-400 mr-2" />
                        <span className="text-neutral-900">{payable.supplier || "Não informado"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="outline">{payable.category}</Badge>
                    </td>
                    <td className="py-4 px-6 font-mono font-medium text-neutral-900">
                      {formatCurrency(payable.amount)}
                    </td>
                    <td className="py-4 px-6 text-neutral-900">
                      {formatDate(payable.dueDate)}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(payable.status)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-2">
                        {payable.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsPaidMutation.mutate(payable.id)}
                            disabled={markAsPaidMutation.isPending}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredPayables.length === 0 && (
            <div className="text-center py-8">
              <p className="text-neutral-600">Nenhuma conta a pagar encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}