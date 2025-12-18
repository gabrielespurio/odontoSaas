import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  Edit2,
  MoreHorizontal,
  Play,
  CheckCircle,
  X
} from "lucide-react";
import AppointmentForm from "@/components/appointments/appointment-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCompanyFilter } from "@/contexts/company-context";
import type { Appointment, User, Procedure } from "@/lib/types";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDentist, setSelectedDentist] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId: companyFilter } = useCompanyFilter();

  // Time slots for schedule (8 AM to 6 PM)
  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(8 + i / 2);
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  // Get week dates
  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Start on Monday
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      week.push(currentDate);
    }
    return week;
  };

  const weekDates = getWeekDates(selectedDate);

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === "next" ? 7 : -7));
    setSelectedDate(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado": return "bg-blue-500";
      case "em_atendimento": return "bg-yellow-500";
      case "concluido": return "bg-green-500";
      case "cancelado": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "agendado": return "Agendado";
      case "em_atendimento": return "Em Atendimento";
      case "concluido": return "Concluído";
      case "cancelado": return "Cancelado";
      default: return "Desconhecido";
    }
  };

  const getStatusActions = (currentStatus: string) => {
    const actions = [];
    
    if (currentStatus === "agendado") {
      actions.push({
        label: "Iniciar Atendimento",
        icon: Play,
        value: "em_atendimento",
        color: "text-yellow-600"
      });
    }
    
    if (currentStatus === "em_atendimento") {
      actions.push({
        label: "Concluir Atendimento",
        icon: CheckCircle,
        value: "concluido",
        color: "text-green-600"
      });
    }
    
    if (currentStatus !== "cancelado" && currentStatus !== "concluido") {
      actions.push({
        label: "Cancelar",
        icon: X,
        value: "cancelado",
        color: "text-red-600"
      });
    }
    
    return actions;
  };

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", { 
      startDate: weekDates[0].toISOString().split('T')[0], 
      endDate: weekDates[6].toISOString().split('T')[0],
      dentistId: selectedDentist !== "all" ? parseInt(selectedDentist) : undefined,
      companyId: companyFilter.companyId
    }],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        startDate: weekDates[0].toISOString().split('T')[0],
        endDate: weekDates[6].toISOString().split('T')[0]
      });
      
      if (selectedDentist !== "all") {
        params.append('dentistId', selectedDentist);
      }
      
      if (companyFilter.companyId) {
        params.append('companyId', companyFilter.companyId.toString());
      }
      
      const response = await fetch(`/api/appointments?${params.toString()}`, {
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

  const { data: dentists } = useQuery<User[]>({
    queryKey: ["/api/users/dentists", companyFilter.companyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyFilter.companyId) {
        params.append('companyId', companyFilter.companyId.toString());
      }
      const url = `/api/users/dentists${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch dentists");
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: (data: { id: number; status: string }) =>
      apiRequest("PUT", `/api/appointments/${data.id}`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments", { companyId: companyFilter.companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/consultations", { companyId: companyFilter }] });
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

  // Helper function to format datetime for HTML input (local time)
  const formatLocalDateTime = (date: Date, time: string) => {
    const dateTime = new Date(date);
    const [hour, minute] = time.split(':').map(Number);
    dateTime.setHours(hour, minute, 0, 0);
    
    // Garantir que a data seja formatada no timezone local
    const year = dateTime.getFullYear();
    const month = String(dateTime.getMonth() + 1).padStart(2, '0');
    const day = String(dateTime.getDate()).padStart(2, '0');
    const hours = String(dateTime.getHours()).padStart(2, '0');
    const minutes = String(dateTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Get appointment that starts at this specific time slot
  const getAppointmentForSlot = (date: Date, time: string, dentistId?: number) => {
    if (!appointments) return null;
    
    // Parse the time slot (e.g., "12:30")
    const [slotHour, slotMinute] = time.split(':').map(Number);
    
    // Find appointment that starts at this exact time
    for (const apt of appointments) {
      const aptDate = new Date(apt.scheduledDate);
      
      // Must be same date
      const isSameDate = aptDate.getDate() === date.getDate() &&
                         aptDate.getMonth() === date.getMonth() &&
                         aptDate.getFullYear() === date.getFullYear();
      
      if (!isSameDate) continue;
      
      // Must be same dentist (if specified)
      if (dentistId && apt.dentistId !== dentistId) continue;
      
      // Must start at exact time slot
      const aptHour = aptDate.getHours();
      const aptMinute = aptDate.getMinutes();
      
      // Force exact match - appointment at 12:30 should ONLY appear in 12:30 slot
      if (aptHour === slotHour && aptMinute === slotMinute) {
        return apt;
      }
    }
    
    return null;
  };

  // Check if current slot is occupied by an appointment that started earlier
  const isSlotOccupiedByPreviousAppointment = (date: Date, time: string, dentistId?: number) => {
    if (!appointments) return null;
    
    const [slotHour, slotMinute] = time.split(':').map(Number);
    const slotTimeInMinutes = slotHour * 60 + slotMinute;
    
    for (const apt of appointments) {
      const aptDate = new Date(apt.scheduledDate);
      const sameDentist = dentistId ? apt.dentistId === dentistId : true;
      
      if (!sameDentist) continue;
      
      // Same date check
      const sameDate = aptDate.getFullYear() === date.getFullYear() &&
                       aptDate.getMonth() === date.getMonth() &&
                       aptDate.getDate() === date.getDate();
      
      if (!sameDate) continue;
      
      const duration = apt.procedure?.duration || 30;
      const aptTimeInMinutes = aptDate.getHours() * 60 + aptDate.getMinutes();
      const endTimeInMinutes = aptTimeInMinutes + duration;
      
      // Check if current slot is within the appointment duration but not the starting slot
      // This slot is occupied by a previous appointment if:
      // 1. The appointment started before this slot
      // 2. The appointment ends after this slot starts
      // 3. The slot is exactly 30 minutes after the appointment start (for continuation slots)
      const isWithinDuration = aptTimeInMinutes < slotTimeInMinutes && slotTimeInMinutes < endTimeInMinutes;
      

      
      if (isWithinDuration) {
        return apt;
      }
    }
    
    return null;
  };

  // Calculate how many slots an appointment should span
  const getAppointmentSlotSpan = (appointment: Appointment) => {
    const duration = appointment.procedure?.duration || 30;
    return Math.ceil(duration / 30); // Each slot is 30 minutes
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAppointment(null);
    setSelectedTimeSlot("");
  };

  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setSelectedTimeSlot("");
    setShowForm(true);
  };

  const handleStatusChange = (appointmentId: number, newStatus: string) => {
    updateAppointmentMutation.mutate({ id: appointmentId, status: newStatus });
  };

  if (appointmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900">Agenda</h1>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button 
              className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto"
              onClick={handleNewAppointment}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
              </DialogTitle>
            </DialogHeader>
            <AppointmentForm
              appointment={editingAppointment}
              prefilledDateTime={selectedTimeSlot}
              onSuccess={() => {
                handleFormSuccess();
                queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingAppointment(null);
                setSelectedTimeSlot("");
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
                {weekDates[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - {weekDates[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </h3>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                  Hoje
                </Button>
              </div>
            </div>
            <div className="flex items-center">
              <Select value={selectedDentist} onValueChange={setSelectedDentist}>
                <SelectTrigger className="w-full sm:w-48">
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
                  variant="default"
                  size="sm"
                  disabled
                >
                  Semana
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Schedule Grid */}
      <div className="hidden lg:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[800px] relative">
              {/* Fixed header */}
              <div className="schedule-header">
                <div className="schedule-day-header"></div>
                {weekDates.map((date, index) => (
                  <div key={index} className="schedule-day-header">
                    <div className="font-medium text-sm text-neutral-700">
                      {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </div>
                    <div className="text-lg font-bold text-neutral-900">
                      {date.getDate()}
                    </div>
                    <div className="text-xs text-neutral-600">
                      {date.toLocaleDateString('pt-BR', { month: 'short' })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Scrollable body */}
              <div className="schedule-body">
                {timeSlots.map((time, timeIndex) => (
                  <div key={time} className="schedule-row">
                    <div className="schedule-time-cell">
                      <span className="text-sm font-medium text-neutral-700">{time}</span>
                    </div>
                    {weekDates.map((date, dayIndex) => {
                      const filteredDentists = selectedDentist === "all" 
                        ? dentists || [] 
                        : dentists?.filter(d => d.id.toString() === selectedDentist) || [];
                      
                      if (filteredDentists.length === 0) {
                        return (
                          <div key={dayIndex} className="schedule-day-cell schedule-empty-cell"
                               onClick={() => {

                                 
                                 setSelectedTimeSlot(formatLocalDateTime(date, time));
                                 setEditingAppointment(null);
                                 setShowForm(true);
                               }}>
                            <div className="schedule-hover-button">
                              <Button size="sm" variant="outline" className="text-xs">
                                Agendar
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      
                      if (filteredDentists.length === 1) {
                        const dentist = filteredDentists[0];
                        const appointment = getAppointmentForSlot(date, time, dentist.id);
                        const occupiedByPrevious = isSlotOccupiedByPreviousAppointment(date, time, dentist.id);
                        
                        if (appointment) {
                          // This is the starting slot of the appointment
                          const duration = appointment.procedure?.duration || 30;
                          const slotSpan = getAppointmentSlotSpan(appointment);
                          

                          
                          return (
                            <div key={dayIndex} className="schedule-day-cell">
                              <div className={`rounded p-2 text-xs relative group ${getStatusColor(appointment.status)} text-white`}
                                   style={{ 
                                     height: `${slotSpan * 60}px`, // Full slot height
                                     width: 'calc(100% - 2px)',
                                     position: 'absolute',
                                     top: '1px',
                                     left: '1px',
                                     zIndex: 10,
                                     border: '1px solid rgba(255,255,255,0.2)'
                                   }}>
                                {/* Conteúdo principal do agendamento */}
                                <div className="cursor-pointer h-full relative" onClick={() => {
                                  setEditingAppointment(appointment);
                                  setShowForm(true);
                                }}>
                                  <div className="font-medium truncate pr-6">{appointment.patient?.name}</div>
                                  <div className="opacity-90 truncate">{appointment.procedure?.name}</div>
                                  <div className="opacity-75 text-xs mt-1">
                                    {new Date(appointment.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div className="opacity-75 text-xs">
                                    {duration >= 60 
                                      ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}min` : ''}`
                                      : `${duration}min`}
                                  </div>
                                  
                                  {/* Botão de ações no canto superior direito */}
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                       onClick={(e) => e.stopPropagation()}
                                       style={{ zIndex: 30 }}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-white/20 rounded text-white">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48" style={{ zIndex: 1000 }}>
                                        {getStatusActions(appointment.status).map((action) => (
                                          <DropdownMenuItem 
                                            key={action.value}
                                            onClick={() => handleStatusChange(appointment.id, action.value)}
                                            className={`${action.color} cursor-pointer`}
                                          >
                                            <action.icon className="w-4 h-4 mr-2" />
                                            {action.label}
                                          </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            setEditingAppointment(appointment);
                                            setShowForm(true);
                                          }}
                                          className="cursor-pointer"
                                        >
                                          <Edit2 className="w-4 h-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="mt-1">
                                  <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                                    {getStatusLabel(appointment.status)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        } else if (occupiedByPrevious) {

                          
                          // This slot is occupied by a previous appointment, show as continuation
                          return (
                            <div key={dayIndex} className="schedule-day-cell">
                              <div className={`rounded p-1 text-xs ${getStatusColor(occupiedByPrevious.status)} text-white opacity-75`}
                                   style={{ 
                                     height: '60px',
                                     width: '100%',
                                     position: 'absolute',
                                     top: '0',
                                     left: '0',
                                     display: 'flex',
                                     alignItems: 'center',
                                     justifyContent: 'center',
                                     cursor: 'pointer'
                                   }}
                                   onClick={() => {
                                     setEditingAppointment(occupiedByPrevious);
                                     setShowForm(true);
                                   }}>
                                <div className="text-center opacity-75">
                                  <div className="text-xs">...</div>
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div key={dayIndex} className="schedule-day-cell schedule-empty-cell"
                                 onClick={() => {
                                   setSelectedTimeSlot(formatLocalDateTime(date, time));
                                   setEditingAppointment(null);
                                   setShowForm(true);
                                 }}>
                              <div className="schedule-hover-button">
                                <Button size="sm" variant="outline" className="text-xs">
                                  Agendar
                                </Button>
                              </div>
                            </div>
                          );
                        }
                      } else {
                        // Multi-dentist view: show appointments starting at this slot or occupied by previous appointments
                        const cellAppointments = filteredDentists.map(dentist => {
                          const appointment = getAppointmentForSlot(date, time, dentist.id);
                          const occupiedByPrevious = isSlotOccupiedByPreviousAppointment(date, time, dentist.id);
                          return { dentist, appointment, occupiedByPrevious };
                        }).filter(item => item.appointment || item.occupiedByPrevious);
                        
                        if (cellAppointments.length > 0) {
                          return (
                            <div key={dayIndex} className="schedule-day-cell relative">
                              {cellAppointments.map(({ dentist, appointment, occupiedByPrevious }) => {
                                if (appointment) {
                                  // This is the starting slot of an appointment - show full appointment with proper spanning
                                  const duration = appointment.procedure?.duration || 30;
                                  const slotSpan = getAppointmentSlotSpan(appointment);
                                  
                                  return (
                                    <div key={`${dentist.id}-apt`} 
                                         className={`rounded p-1 text-xs group ${getStatusColor(appointment.status)} text-white`}
                                         style={{ 
                                           height: `${slotSpan * 60}px`, // Full height spanning multiple slots
                                           width: '100%',
                                           position: 'absolute',
                                           top: '0',
                                           left: '0',
                                           zIndex: 10,
                                           border: '1px solid rgba(255,255,255,0.2)'
                                         }}>
                                      <div className="cursor-pointer h-full relative p-1" onClick={() => {
                                        setEditingAppointment(appointment);
                                        setShowForm(true);
                                      }}>
                                        <div className="font-medium truncate text-xs pr-6">{appointment.patient?.name}</div>
                                        <div className="opacity-90 truncate text-xs">{dentist.name}</div>
                                        <div className="opacity-75 text-xs mt-1">
                                          {new Date(appointment.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="opacity-75 text-xs">
                                          {duration >= 60 
                                            ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}min` : ''}`
                                            : `${duration}min`}
                                        </div>
                                        
                                        {/* Botão posicionado dentro do card */}
                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                             onClick={(e) => e.stopPropagation()}
                                             style={{ zIndex: 30 }}>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-white/20 rounded text-white">
                                                <MoreHorizontal className="h-3 w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                              {getStatusActions(appointment.status).map((action) => (
                                                <DropdownMenuItem 
                                                  key={action.value}
                                                  onClick={() => handleStatusChange(appointment.id, action.value)}
                                                  className={`${action.color} cursor-pointer`}
                                                >
                                                  <action.icon className="w-4 h-4 mr-2" />
                                                  {action.label}
                                                </DropdownMenuItem>
                                              ))}
                                              <DropdownMenuItem 
                                                onClick={() => {
                                                  setEditingAppointment(appointment);
                                                  setShowForm(true);
                                                }}
                                                className="cursor-pointer"
                                              >
                                                <Edit2 className="w-4 h-4 mr-2" />
                                                Editar
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                } else if (occupiedByPrevious) {
                                  // This slot is occupied by a previous appointment - show continuation indicator
                                  return (
                                    <div key={`${dentist.id}-cont`} 
                                         className={`rounded p-1 text-xs ${getStatusColor(occupiedByPrevious.status)} text-white opacity-60`}
                                         style={{ 
                                           height: '60px',
                                           width: '100%',
                                           position: 'absolute',
                                           top: '0',
                                           left: '0',
                                           display: 'flex',
                                           alignItems: 'center',
                                           justifyContent: 'center',
                                           cursor: 'pointer'
                                         }}
                                         onClick={() => {
                                           setEditingAppointment(occupiedByPrevious);
                                           setShowForm(true);
                                         }}>
                                      <div className="text-center opacity-75">
                                        <div className="text-xs">...</div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          );
                        } else {
                          return (
                            <div key={dayIndex} className="schedule-day-cell schedule-empty-cell"
                                 onClick={() => {
                                   setSelectedTimeSlot(formatLocalDateTime(date, time));
                                   setEditingAppointment(null);
                                   setShowForm(true);
                                 }}>
                              <div className="schedule-hover-button">
                                <Button size="sm" variant="outline" className="text-xs">
                                  Agendar
                                </Button>
                              </div>
                            </div>
                          );
                        }
                      }
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Mobile Schedule View */}
      <div className="lg:hidden">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {weekDates.map((date, dayIndex) => (
                <div key={dayIndex} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {date.toLocaleDateString('pt-BR', { weekday: 'long' })}
                      </h3>
                      <p className="text-sm text-neutral-600">
                        {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTimeSlot(formatLocalDateTime(date, "09:00"));
                        setEditingAppointment(null);
                        setShowForm(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agendar
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {timeSlots.map((time) => {
                      const filteredDentists = selectedDentist === "all" 
                        ? dentists || [] 
                        : dentists?.filter(d => d.id.toString() === selectedDentist) || [];
                      
                      const dayAppointments = filteredDentists.map(dentist => ({
                        dentist,
                        appointment: getAppointmentForSlot(date, time, dentist.id)
                      })).filter(item => item.appointment);
                      
                      if (dayAppointments.length === 0) return null;
                      
                      return (
                        <div key={time} className="border-l-2 border-neutral-200 pl-3">
                          <div className="text-sm font-medium text-neutral-700 mb-2">{time}</div>
                          <div className="space-y-2">
                            {dayAppointments.map(({ dentist, appointment }) => (
                              <div
                                key={`${dentist.id}-${appointment?.id}`}
                                className={`p-3 rounded-lg text-white ${getStatusColor(appointment?.status || 'agendado')}`}
                                onClick={() => {
                                  if (appointment) {
                                    setEditingAppointment(appointment);
                                    setShowForm(true);
                                  }
                                }}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium">{appointment?.patient?.name}</div>
                                    <div className="text-sm opacity-90">{appointment?.procedure?.name}</div>
                                    <div className="text-xs opacity-75 mt-1">
                                      Dr. {dentist.name}
                                    </div>
                                    <div className="text-xs opacity-75">
                                      {appointment?.procedure?.duration || 30} min
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                                      {getStatusLabel(appointment?.status || 'agendado')}
                                    </Badge>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/20">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {appointment && getStatusActions(appointment.status).map((action) => (
                                          <DropdownMenuItem
                                            key={action.value}
                                            onClick={() => handleStatusChange(appointment.id, action.value)}
                                            className={`${action.color} cursor-pointer`}
                                          >
                                            <action.icon className="w-4 h-4 mr-2" />
                                            {action.label}
                                          </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuItem
                                          onClick={() => {
                                            if (appointment) {
                                              setEditingAppointment(appointment);
                                              setShowForm(true);
                                            }
                                          }}
                                          className="cursor-pointer"
                                        >
                                          <Edit2 className="w-4 h-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    
                    {timeSlots.every(time => {
                      const filteredDentists = selectedDentist === "all" 
                        ? dentists || [] 
                        : dentists?.filter(d => d.id.toString() === selectedDentist) || [];
                      
                      return filteredDentists.every(dentist => 
                        !getAppointmentForSlot(date, time, dentist.id)
                      );
                    }) && (
                      <div className="text-center py-8 text-neutral-600">
                        <p className="text-sm">Nenhum agendamento para este dia</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}