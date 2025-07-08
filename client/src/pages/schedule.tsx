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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      case "scheduled": return "bg-blue-500";
      case "confirmed": return "bg-green-500";
      case "attended": return "bg-purple-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", { 
      startDate: weekDates[0].toISOString().split('T')[0], 
      endDate: weekDates[6].toISOString().split('T')[0],
      dentistId: selectedDentist !== "all" ? parseInt(selectedDentist) : undefined 
    }],
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

  // Get appointment for specific time slot and date
  const getAppointmentForSlot = (date: Date, time: string, dentistId?: number) => {
    if (!appointments) return null;
    
    const [hour, minute] = time.split(':').map(Number);
    const slotDateTime = new Date(date);
    slotDateTime.setHours(hour, minute, 0, 0);
    
    return appointments.find(apt => {
      const aptDate = new Date(apt.scheduledDate);
      
      // Compare date first
      const sameDate = aptDate.getFullYear() === slotDateTime.getFullYear() &&
                       aptDate.getMonth() === slotDateTime.getMonth() &&
                       aptDate.getDate() === slotDateTime.getDate();
      
      if (!sameDate) return false;
      
      // Check if appointment starts within this 30-minute slot
      const aptHour = aptDate.getHours();
      const aptMinute = aptDate.getMinutes();
      const slotHour = slotDateTime.getHours();
      const slotMinute = slotDateTime.getMinutes();
      
      // Convert both times to minutes for easier comparison
      const aptTimeInMinutes = aptHour * 60 + aptMinute;
      const slotTimeInMinutes = slotHour * 60 + slotMinute;
      
      // Appointment starts in this slot if it's within the 30-minute window
      const isInSlot = aptTimeInMinutes >= slotTimeInMinutes && aptTimeInMinutes < slotTimeInMinutes + 30;
      
      const sameDentist = dentistId ? apt.dentistId === dentistId : true;
      return isInSlot && sameDentist;
    });
  };

  // Check if current slot is occupied by an appointment that started earlier
  const isSlotOccupiedByPreviousAppointment = (date: Date, time: string, dentistId?: number) => {
    if (!appointments) return null;
    
    const [hour, minute] = time.split(':').map(Number);
    const slotDateTime = new Date(date);
    slotDateTime.setHours(hour, minute, 0, 0);
    
    return appointments.find(apt => {
      const aptDate = new Date(apt.scheduledDate);
      const sameDentist = dentistId ? apt.dentistId === dentistId : true;
      
      if (!sameDentist) return false;
      
      // Same date check
      const sameDate = aptDate.getFullYear() === slotDateTime.getFullYear() &&
                       aptDate.getMonth() === slotDateTime.getMonth() &&
                       aptDate.getDate() === slotDateTime.getDate();
      
      if (!sameDate) return false;
      
      const duration = apt.procedure?.duration || 30;
      const aptTimeInMinutes = aptDate.getHours() * 60 + aptDate.getMinutes();
      const slotTimeInMinutes = slotDateTime.getHours() * 60 + slotDateTime.getMinutes();
      const endTimeInMinutes = aptTimeInMinutes + duration;
      
      // Check if current slot is within the appointment duration but not the starting slot
      return aptTimeInMinutes < slotTimeInMinutes && slotTimeInMinutes < endTimeInMinutes;
    });
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
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Agenda</h1>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
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
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-neutral-900">
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

      {/* Teams-style Schedule Grid */}
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
                                 const dateTime = new Date(date);
                                 const [hour, minute] = time.split(':').map(Number);
                                 dateTime.setHours(hour, minute, 0, 0);
                                 setSelectedTimeSlot(dateTime.toISOString().slice(0, 16));
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
                              <div className={`rounded p-2 text-xs cursor-pointer ${getStatusColor(appointment.status)} text-white w-full`}
                                   style={{ 
                                     height: `${slotSpan * 60 - 8}px`, // 60px per slot minus padding
                                     position: 'relative',
                                     zIndex: 10
                                   }}
                                   onClick={() => {
                                     setEditingAppointment(appointment);
                                     setShowForm(true);
                                   }}>
                                <div className="font-medium truncate">{appointment.patient?.name}</div>
                                <div className="opacity-90 truncate">{appointment.procedure?.name}</div>
                                <div className="opacity-75 text-xs mt-1">
                                  {new Date(appointment.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="opacity-75 text-xs">
                                  {duration >= 60 
                                    ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}min` : ''}`
                                    : `${duration}min`}
                                </div>
                              </div>
                            </div>
                          );
                        } else if (occupiedByPrevious) {
                          // This slot is occupied by a previous appointment, show as continuation
                          return (
                            <div key={dayIndex} className="schedule-day-cell">
                              <div className={`rounded p-1 text-xs ${getStatusColor(occupiedByPrevious.status)} text-white w-full opacity-75`}
                                   style={{ 
                                     height: '52px',
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
                                   const dateTime = new Date(date);
                                   const [hour, minute] = time.split(':').map(Number);
                                   dateTime.setHours(hour, minute, 0, 0);
                                   setSelectedTimeSlot(dateTime.toISOString().slice(0, 16));
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
                        const hasAnyAppointment = filteredDentists.some(dentist => 
                          getAppointmentForSlot(date, time, dentist.id)
                        );
                        
                        if (hasAnyAppointment) {
                          return (
                            <div key={dayIndex} className="schedule-day-cell">
                              <div className="w-full space-y-1">
                                {filteredDentists.map((dentist) => {
                                  const appointment = getAppointmentForSlot(date, time, dentist.id);
                                  const occupiedByPrevious = isSlotOccupiedByPreviousAppointment(date, time, dentist.id);
                                  
                                  if (appointment) {
                                    const duration = appointment.procedure?.duration || 30;
                                    const slotSpan = getAppointmentSlotSpan(appointment);
                                    
                                    return (
                                      <div key={dentist.id} className={`rounded p-1 text-xs cursor-pointer ${getStatusColor(appointment.status)} text-white`}
                                           style={{ 
                                             height: `${Math.min(slotSpan * 28, 52)}px`, // Adjusted for multi-dentist view
                                             position: 'relative',
                                             zIndex: 10
                                           }}
                                           onClick={() => {
                                             setEditingAppointment(appointment);
                                             setShowForm(true);
                                           }}>
                                        <div className="font-medium truncate">{appointment.patient?.name}</div>
                                        <div className="opacity-90 truncate">{dentist.name}</div>
                                        <div className="opacity-75 text-xs">
                                          {duration >= 60 
                                            ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}min` : ''}`
                                            : `${duration}min`}
                                        </div>
                                      </div>
                                    );
                                  } else if (occupiedByPrevious) {
                                    return (
                                      <div key={dentist.id} className={`rounded p-1 text-xs ${getStatusColor(occupiedByPrevious.status)} text-white opacity-60`}
                                           style={{ 
                                             height: '24px',
                                             display: 'flex',
                                             alignItems: 'center',
                                             justifyContent: 'center',
                                             cursor: 'pointer'
                                           }}
                                           onClick={() => {
                                             setEditingAppointment(occupiedByPrevious);
                                             setShowForm(true);
                                           }}>
                                        <div className="text-xs">...</div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div key={dayIndex} className="schedule-day-cell schedule-empty-cell"
                                 onClick={() => {
                                   const dateTime = new Date(date);
                                   const [hour, minute] = time.split(':').map(Number);
                                   dateTime.setHours(hour, minute, 0, 0);
                                   setSelectedTimeSlot(dateTime.toISOString().slice(0, 16));
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
  );
}