import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Wrench,
  FileText,
  Activity
} from "lucide-react";
import type { Appointment, Consultation, Financial, Patient } from "@/lib/types";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState("overview");

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: consultations } = useQuery<Consultation[]>({
    queryKey: ["/api/consultations"],
  });

  const { data: financial } = useQuery<Financial[]>({
    queryKey: ["/api/financial"],
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const formatCurrency = (amount: number) => {
    return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const isInDateRange = (date: string) => {
    const checkDate = new Date(date);
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return checkDate >= from && checkDate <= to;
  };

  // Filter data by date range
  const filteredAppointments = appointments?.filter(apt => 
    isInDateRange(apt.scheduledDate)
  ) || [];

  const filteredConsultations = consultations?.filter(cons => 
    isInDateRange(cons.date)
  ) || [];

  const filteredFinancial = financial?.filter(fin => 
    isInDateRange(fin.dueDate)
  ) || [];

  // Calculate statistics
  const stats = {
    totalAppointments: filteredAppointments.length,
    completedAppointments: filteredAppointments.filter(apt => apt.status === "concluido").length,
    cancelledAppointments: filteredAppointments.filter(apt => apt.status === "cancelado").length,
    totalRevenue: filteredFinancial
      .filter(fin => fin.status === "paid")
      .reduce((sum, fin) => sum + Number(fin.amount), 0),
    pendingRevenue: filteredFinancial
      .filter(fin => fin.status === "pending")
      .reduce((sum, fin) => sum + Number(fin.amount), 0),
    totalPatients: patients?.filter(p => p.isActive).length || 0,
    newPatients: patients?.filter(p => 
      p.isActive && isInDateRange(p.createdAt)
    ).length || 0,
  };

  // Most common procedures
  const procedureCount = filteredConsultations.reduce((acc, cons) => {
    cons.procedures?.forEach(proc => {
      acc[proc] = (acc[proc] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topProcedures = Object.entries(procedureCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Appointment status distribution
  const appointmentStats = {
    scheduled: filteredAppointments.filter(apt => apt.status === "agendado").length,
    confirmed: filteredAppointments.filter(apt => apt.status === "em_atendimento").length,
    attended: filteredAppointments.filter(apt => apt.status === "concluido").length,
    cancelled: filteredAppointments.filter(apt => apt.status === "cancelado").length,
  };

  const exportReport = () => {
    // Simple CSV export functionality
    const csvData = [
      ['Relatório de Atividades - OdontoSync'],
      ['Período:', `${formatDate(dateFrom)} a ${formatDate(dateTo)}`],
      [''],
      ['Resumo Geral'],
      ['Total de Agendamentos', stats.totalAppointments],
      ['Atendimentos Realizados', stats.completedAppointments],
      ['Atendimentos Cancelados', stats.cancelledAppointments],
      ['Receita Total', formatCurrency(stats.totalRevenue)],
      ['Receita Pendente', formatCurrency(stats.pendingRevenue)],
      ['Total de Pacientes', stats.totalPatients],
      ['Novos Pacientes', stats.newPatients],
      [''],
      ['Procedimentos Mais Realizados'],
      ...topProcedures.map(([proc, count]) => [proc, count]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${dateFrom}_${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Relatórios</h1>
        <Button onClick={exportReport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Data Início</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Data Fim</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportType">Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Visão Geral</SelectItem>
                  <SelectItem value="financial">Financeiro</SelectItem>
                  <SelectItem value="appointments">Agendamentos</SelectItem>
                  <SelectItem value="procedures">Procedimentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total de Agendamentos</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.totalAppointments}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="text-blue-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Atendimentos Realizados</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.completedAppointments}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Activity className="text-green-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Receita Total</p>
                <p className="text-2xl font-bold text-neutral-900">{formatCurrency(stats.totalRevenue)}</p>
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
                <p className="text-sm font-medium text-neutral-600">Novos Pacientes</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.newPatients}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="text-purple-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Status dos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                  <span className="text-sm text-neutral-700">Agendados</span>
                </div>
                <span className="font-semibold">{appointmentStats.scheduled}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                  <span className="text-sm text-neutral-700">Em Atendimento</span>
                </div>
                <span className="font-semibold">{appointmentStats.confirmed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                  <span className="text-sm text-neutral-700">Concluídos</span>
                </div>
                <span className="font-semibold">{appointmentStats.attended}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                  <span className="text-sm text-neutral-700">Cancelados</span>
                </div>
                <span className="font-semibold">{appointmentStats.cancelled}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Procedures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="w-5 h-5 mr-2" />
              Procedimentos Mais Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProcedures.length > 0 ? (
                topProcedures.map(([procedure, count], index) => (
                  <div key={procedure} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                        {index + 1}
                      </div>
                      <span className="text-sm text-neutral-700">{procedure}</span>
                    </div>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-neutral-600 py-4">
                  Nenhum procedimento registrado no período
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700">Receita Recebida</span>
                <span className="font-semibold text-green-600">{formatCurrency(stats.totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700">Contas a Receber</span>
                <span className="font-semibold text-yellow-600">{formatCurrency(stats.pendingRevenue)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm font-medium text-neutral-900">Total Previsto</span>
                <span className="font-bold text-neutral-900">
                  {formatCurrency(stats.totalRevenue + stats.pendingRevenue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Resumo de Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700">Total de Consultas</span>
                <span className="font-semibold">{filteredConsultations.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700">Taxa de Comparecimento</span>
                <span className="font-semibold">
                  {stats.totalAppointments > 0 
                    ? `${Math.round((stats.completedAppointments / stats.totalAppointments) * 100)}%`
                    : "0%"
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700">Taxa de Cancelamento</span>
                <span className="font-semibold">
                  {stats.totalAppointments > 0 
                    ? `${Math.round((stats.cancelledAppointments / stats.totalAppointments) * 100)}%`
                    : "0%"
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700">Pacientes Ativos</span>
                <span className="font-semibold">{stats.totalPatients}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Resumo do Período ({formatDate(dateFrom)} - {formatDate(dateTo)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{stats.totalAppointments}</p>
              <p className="text-sm text-neutral-600">Agendamentos Total</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-sm text-neutral-600">Receita Realizada</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{stats.newPatients}</p>
              <p className="text-sm text-neutral-600">Novos Pacientes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
