import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  Edit2
} from "lucide-react";
import AppointmentForm from "@/components/appointments/appointment-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Appointment, User, Procedure } from "@/lib/types";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDentist, setSelectedDentist] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", { date: selectedDate.toISOString().split('T')[0], dentistId: selectedDentist !== "all" ? parseInt(selectedDentist) : undefined }],
  });

  const { data: dentists } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "dentist" }],
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: (data: { id: number; status: string }) =>
      apiRequest("PUT", `/api/appointments/${data.id}`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Sucesso",
        description: "Status do agendamento atualizado",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar agendamento",
        variant: "destructive",
      });
    },
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

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
  };

  const changeDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (view === "day") {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (view === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const getAppointmentForSlot = (time: string) => {
    return appointments?.find(apt => {
      const aptTime = formatTime(apt.scheduledDate);
      return aptTime === time;
    });
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAppointment(null);
  };

  const handleStatusChange = (appointmentId: number, newStatus: string) => {
    updateAppointmentMutation.mutate({ id: appointmentId, status: newStatus });
  };

  if (appointmentsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Agenda</h1>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingAppointment(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
              </DialogTitle>
            </DialogHeader>
            <AppointmentForm
              appointment={editingAppointment}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-neutral-900">
                {formatDate(selectedDate)}
              </h3>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => changeDate('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => changeDate('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                  Hoje
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedDentist} onValueChange={setSelectedDentist}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecionar profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Profissionais</SelectItem>
                  {dentists?.map((dentist) => (
                    <SelectItem key={dentist.id} value={dentist.id.toString()}>
                      {dentist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Button 
                  variant={view === "day" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setView("day")}
                >
                  Dia
                </Button>
                <Button 
                  variant={view === "week" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setView("week")}
                >
                  Semana
                </Button>
                <Button 
                  variant={view === "month" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setView("month")}
                >
                  Mês
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Morning Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Manhã (08:00 - 12:00)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {generateTimeSlots().filter(time => {
                const hour = parseInt(time.split(':')[0]);
                return hour >= 8 && hour < 12;
              }).map((time) => {
                const appointment = getAppointmentForSlot(time);
                
                if (appointment) {
                  return (
                    <div key={time} className={`flex items-center p-3 rounded-lg border-2 ${
                      appointment.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                      appointment.status === 'scheduled' ? 'bg-yellow-50 border-yellow-200' :
                      appointment.status === 'attended' ? 'bg-blue-50 border-blue-200' :
                      'bg-red-50 border-red-200'
                    }`}>
                      <div className="w-16 text-center">
                        <p className="text-sm font-medium">{time}</p>
                      </div>
                      <div className="flex-1 ml-3">
                        <p className="text-sm font-medium">{appointment.patient?.name}</p>
                        <p className="text-xs text-neutral-600">{appointment.procedure?.name}</p>
                        <p className="text-xs text-neutral-500">{appointment.dentist?.name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(appointment.status)}
                        <Select
                          value={appointment.status}
                          onValueChange={(value) => handleStatusChange(appointment.id, value)}
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Agendado</SelectItem>
                            <SelectItem value="confirmed">Confirmado</SelectItem>
                            <SelectItem value="attended">Atendido</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingAppointment(appointment);
                            setShowForm(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={time} className="flex items-center p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <div className="w-16 text-center">
                      <p className="text-sm font-medium text-neutral-500">{time}</p>
                    </div>
                    <div className="flex-1 ml-3">
                      <p className="text-sm text-neutral-500">Horário Disponível</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowForm(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Afternoon Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Tarde (14:00 - 18:00)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {generateTimeSlots().filter(time => {
                const hour = parseInt(time.split(':')[0]);
                return hour >= 14 && hour < 18;
              }).map((time) => {
                const appointment = getAppointmentForSlot(time);
                
                if (appointment) {
                  return (
                    <div key={time} className={`flex items-center p-3 rounded-lg border-2 ${
                      appointment.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                      appointment.status === 'scheduled' ? 'bg-yellow-50 border-yellow-200' :
                      appointment.status === 'attended' ? 'bg-blue-50 border-blue-200' :
                      'bg-red-50 border-red-200'
                    }`}>
                      <div className="w-16 text-center">
                        <p className="text-sm font-medium">{time}</p>
                      </div>
                      <div className="flex-1 ml-3">
                        <p className="text-sm font-medium">{appointment.patient?.name}</p>
                        <p className="text-xs text-neutral-600">{appointment.procedure?.name}</p>
                        <p className="text-xs text-neutral-500">{appointment.dentist?.name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(appointment.status)}
                        <Select
                          value={appointment.status}
                          onValueChange={(value) => handleStatusChange(appointment.id, value)}
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Agendado</SelectItem>
                            <SelectItem value="confirmed">Confirmado</SelectItem>
                            <SelectItem value="attended">Atendido</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingAppointment(appointment);
                            setShowForm(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={time} className="flex items-center p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <div className="w-16 text-center">
                      <p className="text-sm font-medium text-neutral-500">{time}</p>
                    </div>
                    <div className="flex-1 ml-3">
                      <p className="text-sm text-neutral-500">Horário Disponível</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowForm(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
