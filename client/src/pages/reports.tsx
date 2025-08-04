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
  Activity,
  Loader2
} from "lucide-react";
import { useCompanyFilter } from "@/contexts/company-context";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState("overview");
  const [reportGenerated, setReportGenerated] = useState(false);
  const companyFilter = useCompanyFilter();

  // Dynamic report data based on selected type
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: [`/api/reports/${reportType}`, { startDate: dateFrom, endDate: dateTo, companyId: companyFilter }],
    enabled: reportGenerated,
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        startDate: dateFrom,
        endDate: dateTo
      });
      
      if (companyFilter) {
        params.append('companyId', companyFilter.toString());
      }
      
      const response = await fetch(`/api/reports/${reportType}?${params.toString()}`, {
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

  const formatCurrency = (amount: number) => {
    return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const generateReport = async () => {
    setReportGenerated(true);
    await refetch();
  };

  const exportReport = () => {
    if (!reportData) return;

    const csvData = [
      ['Relatório OdontoSync'],
      ['Tipo:', getReportTitle(reportType)],
      ['Período:', `${formatDate(dateFrom)} a ${formatDate(dateTo)}`],
      ['Gerado em:', new Date().toLocaleDateString('pt-BR')],
      [''],
    ];

    if (reportType === 'overview') {
      csvData.push(
        ['Resumo Geral'],
        ['Total de Agendamentos', reportData.statistics.totalAppointments],
        ['Agendamentos Concluídos', reportData.statistics.completedAppointments],
        ['Agendamentos Cancelados', reportData.statistics.cancelledAppointments],
        ['Total de Consultas', reportData.statistics.totalConsultations],
        ['Receita Total', formatCurrency(reportData.statistics.totalRevenue)],
        ['Receita Pendente', formatCurrency(reportData.statistics.pendingRevenue)],
        ['Total de Pacientes', reportData.statistics.totalPatients],
        ['Novos Pacientes', reportData.statistics.newPatients],
      );
    } else if (reportType === 'financial') {
      csvData.push(
        ['Resumo Financeiro'],
        ['Receita Total', formatCurrency(reportData.statistics.totalRevenue)],
        ['Receita Pendente', formatCurrency(reportData.statistics.pendingRevenue)],
        ['Gastos Totais', formatCurrency(reportData.statistics.totalExpenses)],
        ['Gastos Pendentes', formatCurrency(reportData.statistics.pendingExpenses)],
        ['Lucro Líquido', formatCurrency(reportData.statistics.netIncome)],
        ['Margem de Lucro', formatPercent(reportData.statistics.profitMargin)],
      );
    } else if (reportType === 'appointments') {
      csvData.push(
        ['Resumo de Agendamentos'],
        ['Total de Agendamentos', reportData.statistics.totalAppointments],
        ['Agendados', reportData.statistics.scheduledAppointments],
        ['Em Atendimento', reportData.statistics.inProgressAppointments],
        ['Concluídos', reportData.statistics.completedAppointments],
        ['Cancelados', reportData.statistics.cancelledAppointments],
        ['Taxa de Comparecimento', formatPercent(reportData.statistics.attendanceRate)],
        ['Taxa de Cancelamento', formatPercent(reportData.statistics.cancellationRate)],
      );
    } else if (reportType === 'procedures') {
      csvData.push(
        ['Resumo de Procedimentos'],
        ['Total de Consultas', reportData.statistics.totalConsultations],
        ['Total de Procedimentos', reportData.statistics.totalProcedures],
        ['Procedimentos Únicos', reportData.statistics.uniqueProcedures],
        ['Média por Consulta', reportData.statistics.averageProceduresPerConsultation.toFixed(1)],
        [''],
        ['Procedimentos Mais Realizados'],
        ...reportData.topProcedures.map(([proc, count]) => [proc, count]),
      );
    }

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${reportType}_${dateFrom}_${dateTo}.csv`;
    link.click();
  };

  const getReportTitle = (type: string) => {
    const titles = {
      overview: 'Visão Geral',
      financial: 'Financeiro',
      appointments: 'Agendamentos',
      procedures: 'Procedimentos'
    };
    return titles[type] || 'Relatório';
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Relatórios</h1>
        {reportGenerated && reportData && (
          <Button onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        )}
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
              <Button 
                className="w-full" 
                onClick={generateReport}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Gerar Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-neutral-600">Gerando relatório...</span>
        </div>
      )}

      {/* Report Content */}
      {reportGenerated && reportData && !isLoading && (
        <>
          {/* Overview Report */}
          {reportType === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-600">Total de Agendamentos</p>
                        <p className="text-2xl font-bold text-neutral-900">{reportData.statistics.totalAppointments}</p>
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
                        <p className="text-2xl font-bold text-neutral-900">{reportData.statistics.completedAppointments}</p>
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
                        <p className="text-2xl font-bold text-neutral-900">{formatCurrency(reportData.statistics.totalRevenue)}</p>
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
                        <p className="text-2xl font-bold text-neutral-900">{reportData.statistics.newPatients}</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Users className="text-purple-600 w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Distribution */}
              <Card className="mb-6">
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
                      <span className="font-semibold">{reportData.appointmentsByStatus.agendado}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                        <span className="text-sm text-neutral-700">Em Atendimento</span>
                      </div>
                      <span className="font-semibold">{reportData.appointmentsByStatus.em_atendimento}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                        <span className="text-sm text-neutral-700">Concluídos</span>
                      </div>
                      <span className="font-semibold">{reportData.appointmentsByStatus.concluido}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                        <span className="text-sm text-neutral-700">Cancelados</span>
                      </div>
                      <span className="font-semibold">{reportData.appointmentsByStatus.cancelado}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Financial Report */}
          {reportType === 'financial' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                      <span className="font-semibold text-green-600">{formatCurrency(reportData.statistics.totalRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">Receita Pendente</span>
                      <span className="font-semibold text-yellow-600">{formatCurrency(reportData.statistics.pendingRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">Gastos Pagos</span>
                      <span className="font-semibold text-red-600">{formatCurrency(reportData.statistics.totalExpenses)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">Gastos Pendentes</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(reportData.statistics.pendingExpenses)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-4">
                      <span className="text-sm font-medium text-neutral-900">Lucro Líquido</span>
                      <span className={`font-bold ${reportData.statistics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(reportData.statistics.netIncome)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-900">Margem de Lucro</span>
                      <span className={`font-bold ${reportData.statistics.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(reportData.statistics.profitMargin)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Status das Contas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-2">Contas a Receber</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-600">Pagas</span>
                          <span className="font-semibold text-green-600">{reportData.receivablesByStatus.paid}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-600">Pendentes</span>
                          <span className="font-semibold text-yellow-600">{reportData.receivablesByStatus.pending}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-600">Vencidas</span>
                          <span className="font-semibold text-red-600">{reportData.receivablesByStatus.overdue}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-2">Contas a Pagar</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-600">Pagas</span>
                          <span className="font-semibold text-green-600">{reportData.payablesByStatus.paid}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-600">Pendentes</span>
                          <span className="font-semibold text-yellow-600">{reportData.payablesByStatus.pending}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-600">Vencidas</span>
                          <span className="font-semibold text-red-600">{reportData.payablesByStatus.overdue}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Appointments Report */}
          {reportType === 'appointments' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Estatísticas de Agendamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">Total de Agendamentos</span>
                      <span className="font-semibold">{reportData.statistics.totalAppointments}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">Taxa de Comparecimento</span>
                      <span className="font-semibold text-green-600">{formatPercent(reportData.statistics.attendanceRate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">Taxa de Cancelamento</span>
                      <span className="font-semibold text-red-600">{formatPercent(reportData.statistics.cancellationRate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">Total de Consultas</span>
                      <span className="font-semibold">{reportData.statistics.totalConsultations}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Desempenho por Dentista
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(reportData.dentistStats || {}).map(([dentist, stats]) => (
                      <div key={dentist} className="border-b pb-3 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-neutral-700">{dentist}</span>
                          <span className="font-semibold">{stats.total}</span>
                        </div>
                        <div className="flex justify-between text-xs text-neutral-600">
                          <span>Concluídos: {stats.concluido}</span>
                          <span>Cancelados: {stats.cancelado}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Procedures Report */}
          {reportType === 'procedures' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Estatísticas de Procedimentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">Total de Consultas</span>
                      <span className="font-semibold">{reportData.statistics.totalConsultations}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">Total de Procedimentos</span>
                      <span className="font-semibold">{reportData.statistics.totalProcedures}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">Procedimentos Únicos</span>
                      <span className="font-semibold">{reportData.statistics.uniqueProcedures}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">Média por Consulta</span>
                      <span className="font-semibold">{reportData.statistics.averageProceduresPerConsultation.toFixed(1)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wrench className="w-5 h-5 mr-2" />
                    Procedimentos Mais Realizados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.topProcedures && reportData.topProcedures.length > 0 ? (
                      reportData.topProcedures.map(([procedure, count], index) => (
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
            </div>
          )}

          {/* Period Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Resumo do Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-sm text-neutral-600 mb-2">
                  Relatório de <strong>{getReportTitle(reportType)}</strong> gerado para o período de
                </p>
                <p className="text-lg font-semibold text-neutral-900">
                  {formatDate(dateFrom)} até {formatDate(dateTo)}
                </p>
                <p className="text-xs text-neutral-500 mt-2">
                  Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!reportGenerated && (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            Selecione o período e tipo de relatório
          </h3>
          <p className="text-neutral-600 mb-4">
            Configure os filtros acima e clique em "Gerar Relatório" para visualizar os dados
          </p>
        </div>
      )}
    </div>
  );
}