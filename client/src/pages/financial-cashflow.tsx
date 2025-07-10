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
  TrendingDown,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type CashFlowEntry = {
  id: number;
  type: "income" | "expense";
  amount: string;
  description: string;
  date: string;
  category?: string;
  receivableId?: number;
  payableId?: number;
  createdAt: string;
};

export default function FinancialCashFlow() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month");
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate date range based on selected period
  const getDateRange = () => {
    const today = new Date();
    let startDate: Date;
    
    switch (selectedPeriod) {
      case "week":
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        break;
      case "month":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "quarter":
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case "year":
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };

  const { startDate, endDate } = getDateRange();

  const { data: cashFlowEntries, isLoading: cashFlowLoading } = useQuery<CashFlowEntry[]>({
    queryKey: ["/api/cash-flow", { startDate, endDate }],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/financial-metrics", { startDate, endDate }],
  });

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getTypeIcon = (type: string) => {
    return type === "income" ? ArrowUpCircle : ArrowDownCircle;
  };

  const getTypeBadge = (type: string, amount: string) => {
    const Icon = getTypeIcon(type);
    const isIncome = type === "income";
    
    return (
      <div className={`flex items-center ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
        <Icon className="w-4 h-4 mr-2" />
        <span className="font-medium">
          {isIncome ? '+' : '-'} {formatCurrency(amount)}
        </span>
      </div>
    );
  };

  const filteredEntries = cashFlowEntries?.filter(entry => {
    const matchesSearch = !search || 
      entry.description.toLowerCase().includes(search.toLowerCase()) ||
      entry.category?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = selectedType === "all" || entry.type === selectedType;
    
    return matchesSearch && matchesType;
  }) || [];

  const totalIncome = filteredEntries
    .filter(e => e.type === "income")
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const totalExpense = filteredEntries
    .filter(e => e.type === "expense")
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const balance = totalIncome - totalExpense;

  if (cashFlowLoading || metricsLoading) {
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
        <h1 className="text-2xl font-bold text-neutral-900">Fluxo de Caixa</h1>
        <div className="flex gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Entrada
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Entrada de Caixa</DialogTitle>
              </DialogHeader>
              <p className="text-center text-neutral-600 py-8">
                Formulário de entrada de caixa será implementado
              </p>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Entradas</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalIncome)}
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
                <p className="text-sm font-medium text-neutral-600">Total Saídas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalExpense)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="text-red-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Saldo Período</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                balance >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Activity className={`w-6 h-6 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Saldo Atual</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(metrics?.currentBalance || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <DollarSign className="text-primary w-6 h-6" />
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
                placeholder="Buscar por descrição ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="income">Entradas</SelectItem>
                <SelectItem value="expense">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Table */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações do Período</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="responsive-table-container">
            <table className="responsive-table">
              <thead className="bg-neutral-50">
                <tr className="border-b">
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Data</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Descrição</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Categoria</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Tipo</th>
                  <th className="text-right py-4 px-6 font-medium text-neutral-700">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6 text-neutral-900">
                      {formatDate(entry.date)}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-neutral-900">{entry.description}</p>
                    </td>
                    <td className="py-4 px-6">
                      {entry.category && (
                        <Badge variant="outline">{entry.category}</Badge>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={entry.type === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {entry.type === "income" ? "Entrada" : "Saída"}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-right font-mono">
                      {getTypeBadge(entry.type, entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredEntries.length === 0 && (
            <div className="text-center py-8">
              <p className="text-neutral-600">Nenhuma movimentação encontrada para o período selecionado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}