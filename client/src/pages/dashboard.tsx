import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  CalendarPlus,
  UserPlus, 
  Stethoscope,
  BarChart3,
  User
} from "lucide-react";
import { Link } from "wouter";
import type { DashboardMetrics, Appointment } from "@/lib/types";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: todayAppointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", new Date().toISOString().split('T')[0]],
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: "Agendado", className: "status-scheduled" },
      confirmed: { label: "Confirmado", className: "status-confirmed" },
      attended: { label: "Atendido", className: "status-attended" },
      cancelled: { label: "Cancelado", className: "status-cancelled" },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.scheduled;
    return (
      <Badge className={`status-badge ${statusInfo.className}`}>
        {statusInfo.label}
      </Badge>
    );
  };

  if (metricsLoading || appointmentsLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-12">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Atendimentos Hoje</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {metrics?.todayAppointments || 0}
                </p>
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
                <p className="text-sm font-medium text-neutral-600">Pacientes Ativos</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {metrics?.activePatients || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="text-green-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Faturamento Mensal</p>
                <p className="text-2xl font-bold text-neutral-900">
                  R$ {metrics?.monthlyRevenue ? Number(metrics.monthlyRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <DollarSign className="text-yellow-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Contas a Receber</p>
                <p className="text-2xl font-bold text-neutral-900">
                  R$ {metrics?.pendingPayments ? Number(metrics.pendingPayments).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Clock className="text-red-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Próximos Atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAppointments?.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="text-blue-600 w-4 h-4" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-neutral-900">{appointment.patient?.name}</p>
                      <p className="text-xs text-neutral-600">{appointment.procedure?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-900">
                      {new Date(appointment.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {getStatusBadge(appointment.status)}
                  </div>
                </div>
              ))}
              {(!todayAppointments || todayAppointments.length === 0) && (
                <p className="text-sm text-neutral-600 text-center py-8">
                  Nenhum atendimento agendado para hoje
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/patients">
                <Button variant="outline" className="h-auto flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 border-blue-200">
                  <UserPlus className="text-blue-600 w-6 h-6 mb-2" />
                  <span className="text-sm font-medium text-blue-900">Novo Paciente</span>
                </Button>
              </Link>
              
              <Link href="/schedule">
                <Button variant="outline" className="h-auto flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 border-green-200">
                  <CalendarPlus className="text-green-600 w-6 h-6 mb-2" />
                  <span className="text-sm font-medium text-green-900">Agendar</span>
                </Button>
              </Link>
              
              <Link href="/consultations">
                <Button variant="outline" className="h-auto flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 border-purple-200">
                  <Stethoscope className="text-purple-600 w-6 h-6 mb-2" />
                  <span className="text-sm font-medium text-purple-900">Atendimento</span>
                </Button>
              </Link>
              
              <Link href="/reports">
                <Button variant="outline" className="h-auto flex flex-col items-center p-4 bg-yellow-50 hover:bg-yellow-100 border-yellow-200">
                  <BarChart3 className="text-yellow-600 w-6 h-6 mb-2" />
                  <span className="text-sm font-medium text-yellow-900">Relatório</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
