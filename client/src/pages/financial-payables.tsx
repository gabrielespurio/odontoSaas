import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
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
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/use-pagination";

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
  createdBy?: number;
};

const payableSchema = z.object({
  amount: z.number().positive("Valor deve ser positivo"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  category: z.enum(["rent", "salaries", "materials", "equipment", "utilities", "marketing", "other"]),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).default("pending"),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(["cash", "credit_card", "debit_card", "pix", "bank_transfer", "check"]).optional(),
  accountType: z.enum(["clinic", "dentist"]).default("clinic"),
  dentistId: z.number().optional(),
}).refine((data) => {
  if (data.accountType === "dentist" && !data.dentistId) {
    return false;
  }
  return true;
}, {
  message: "Dentista é obrigatório quando o tipo de conta é 'Dentista Específico'",
  path: ["dentistId"],
});

export default function FinancialPayables() {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof payableSchema>>({
    resolver: zodResolver(payableSchema),
    defaultValues: {
      amount: 0,
      dueDate: "",
      description: "",
      category: undefined,
      supplier: "",
      notes: "",
      status: "pending",
      paymentDate: "",
      paymentMethod: undefined,
      accountType: "clinic",
      dentistId: undefined,
    },
  });

  const createPayableMutation = useMutation({
    mutationFn: (data: z.infer<typeof payableSchema>) => {
      const payload = {
        ...data,
        // Remove empty paymentMethod if status is not paid
        paymentMethod: data.status === "paid" && data.paymentMethod ? data.paymentMethod : undefined,
        // Remove empty paymentDate (convert empty string to undefined)
        paymentDate: data.paymentDate && data.paymentDate.trim() !== "" ? data.paymentDate : undefined,
      };
      return apiRequest("POST", "/api/payables", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payables"] });
      toast({
        title: "Sucesso",
        description: "Conta a pagar criada com sucesso",
      });
      setShowForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conta a pagar",
        variant: "destructive",
      });
    },
  });

  const updatePayableMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof payableSchema> }) => {
      const payload = {
        ...data,
        // Remove empty paymentMethod if status is not paid
        paymentMethod: data.status === "paid" && data.paymentMethod ? data.paymentMethod : undefined,
        // Remove empty paymentDate (convert empty string to undefined)
        paymentDate: data.paymentDate && data.paymentDate.trim() !== "" ? data.paymentDate : undefined,
      };
      return apiRequest("PUT", `/api/payables/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payables"] });
      toast({
        title: "Sucesso",
        description: "Conta a pagar atualizada com sucesso",
      });
      setShowForm(false);
      setEditingPayable(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar conta a pagar",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof payableSchema>) => {
    if (editingPayable) {
      updatePayableMutation.mutate({ id: editingPayable.id, data });
    } else {
      createPayableMutation.mutate(data);
    }
  };

  const openEditForm = (payable: Payable) => {
    setEditingPayable(payable);
    form.reset({
      amount: parseFloat(payable.amount),
      dueDate: payable.dueDate,
      description: payable.description,
      category: payable.category as any,
      supplier: payable.supplier || "",
      notes: payable.notes || "",
      status: payable.status,
      paymentDate: payable.paymentDate || "",
      paymentMethod: payable.paymentMethod as any,
      accountType: (payable as any).accountType || "clinic",
      dentistId: (payable as any).dentistId || undefined,
    });
    setShowForm(true);
  };

  const { data: payables, isLoading: payablesLoading } = useQuery<Payable[]>({
    queryKey: ["/api/payables", selectedStatus, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      const url = `/api/payables${params.toString() ? `?${params.toString()}` : ""}`;
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    },
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: dentists } = useQuery<any[]>({
    queryKey: ["/api/users/dentists"],
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

  const deletePayableMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/payables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payables"] });
      toast({
        title: "Sucesso",
        description: "Conta a pagar excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir conta a pagar",
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

  const getStatusBadge = (status: string, dueDate: string) => {
    // Verificar se está vencido
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

  const filteredPayables = payables?.filter(payable => {
    const matchesSearch = !search || 
      payable.description.toLowerCase().includes(search.toLowerCase()) ||
      payable.supplier?.toLowerCase().includes(search.toLowerCase()) ||
      payable.category.toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch;
  }) || [];

  // Paginação
  const pagination = usePagination({
    data: filteredPayables,
    itemsPerPage: 10,
  });

  const totalPending = filteredPayables
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalPaid = filteredPayables
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalOverdue = filteredPayables
    .filter(p => p.status === "pending" && new Date(p.dueDate) < new Date())
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPayable ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Manutenção de equipamentos" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            value={field.value || ""}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="rent">Aluguel</SelectItem>
                            <SelectItem value="salaries">Salários</SelectItem>
                            <SelectItem value="materials">Materiais</SelectItem>
                            <SelectItem value="equipment">Equipamentos</SelectItem>
                            <SelectItem value="utilities">Utilidades</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="other">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fornecedor</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: TechDental Services" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="accountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Conta *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="clinic">Clínica Geral</SelectItem>
                            <SelectItem value="dentist">Dentista Específico</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("accountType") === "dentist" && (
                    <FormField
                      control={form.control}
                      name="dentistId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dentista *</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar dentista" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {dentists?.map((dentist) => (
                                <SelectItem key={dentist.id} value={dentist.id.toString()}>
                                  {dentist.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Vencimento *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="paid">Pago</SelectItem>
                            <SelectItem value="overdue">Vencido</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("status") === "paid" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Pagamento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Método de Pagamento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar método" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Dinheiro</SelectItem>
                              <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                              <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                              <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                              <SelectItem value="pix">PIX</SelectItem>
                              <SelectItem value="check">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Observações adicionais sobre a conta..."
                          className="resize-none"
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingPayable(null);
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPayableMutation.isPending || updatePayableMutation.isPending}
                  >
                    {createPayableMutation.isPending || updatePayableMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
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

      {/* Contas a Pagar - Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">Contas a Pagar</CardTitle>
        </CardHeader>
        <CardContent>
          {payablesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-gray-300 rounded mb-2"></div>
                </div>
              ))}
            </div>
          ) : filteredPayables.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma conta a pagar encontrada
              </h3>
              <p className="text-gray-600">
                Crie uma nova conta a pagar para começar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.currentData.map((payable) => {
                    const user = users?.find(u => u.id === payable.createdBy);
                    
                    return (
                      <TableRow key={payable.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">
                              {payable.description}
                            </p>
                            {payable.notes && (
                              <p className="text-sm text-gray-500 mt-1">
                                {payable.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-700 font-medium text-xs">
                                {user?.name.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {user?.name || "Não identificado"}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <span className="text-sm text-gray-900">
                            {payable.supplier || "Não informado"}
                          </span>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {payable.category}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(payable.amount)}
                          </span>
                        </TableCell>
                        
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {formatDate(payable.dueDate)}
                          </span>
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(payable.status, payable.dueDate)}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditForm(payable)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              {payable.status === "pending" && (
                                <DropdownMenuItem 
                                  onClick={() => markAsPaidMutation.mutate(payable.id)}
                                  disabled={markAsPaidMutation.isPending}
                                >
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Pagar
                                </DropdownMenuItem>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza de que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deletePayableMutation.mutate(payable.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
          {filteredPayables.length > 0 && (
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
  );
}