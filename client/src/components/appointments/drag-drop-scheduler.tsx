import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TimezoneUtils } from "@/lib/timezone-utils";
import type { Appointment, Patient, User, Procedure } from "@/lib/types";

interface DragDropSchedulerProps {
  appointments: (Appointment & { patient: Patient; dentist: User; procedure: Procedure })[];
  timeSlots: string[];
  weekDates: Date[];
  onAppointmentUpdate: () => void;
}

interface DragState {
  isDragging: boolean;
  appointmentId: number | null;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  originalSlot: { date: Date; time: string } | null;
}

export function DragDropScheduler({ 
  appointments, 
  timeSlots, 
  weekDates, 
  onAppointmentUpdate 
}: DragDropSchedulerProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    appointmentId: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    originalSlot: null
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schedulerRef = useRef<HTMLDivElement>(null);

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest(`/api/appointments/${id}`, {
        method: "PUT",
        body: updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      onAppointmentUpdate();
      toast({
        title: "Sucesso",
        description: "Agendamento reagendado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao reagendar agendamento",
        variant: "destructive",
      });
    }
  });

  const handleMouseDown = (e: React.MouseEvent, appointment: Appointment & { patient: Patient; dentist: User; procedure: Procedure }) => {
    const rect = schedulerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const appointmentDate = new Date(appointment.scheduledDate);
    const timeString = TimezoneUtils.formatTimeForDisplay(appointmentDate);

    setDragState({
      isDragging: true,
      appointmentId: appointment.id,
      startPosition: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      currentPosition: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      originalSlot: { 
        date: appointmentDate, 
        time: timeString.substring(0, 5) // Remove seconds
      }
    });

    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging || !schedulerRef.current) return;

    const rect = schedulerRef.current.getBoundingClientRect();
    setDragState(prev => ({
      ...prev,
      currentPosition: { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragState.isDragging || !schedulerRef.current) return;

    const rect = schedulerRef.current.getBoundingClientRect();
    const dropPosition = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Calculate which slot the appointment was dropped on
    const slotInfo = getSlotFromPosition(dropPosition);
    
    if (slotInfo && dragState.appointmentId) {
      const appointment = appointments.find(apt => apt.id === dragState.appointmentId);
      if (appointment) {
        rescheduleAppointment(appointment, slotInfo.date, slotInfo.time);
      }
    }

    setDragState({
      isDragging: false,
      appointmentId: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      originalSlot: null
    });
  };

  const getSlotFromPosition = (position: { x: number; y: number }) => {
    // This is a simplified calculation - in a real implementation,
    // you'd need to account for the exact grid layout
    const slotWidth = 150; // approximate width of each day column
    const slotHeight = 60; // height of each time slot
    const headerHeight = 50; // height of header

    const dayIndex = Math.floor(position.x / slotWidth);
    const timeIndex = Math.floor((position.y - headerHeight) / slotHeight);

    if (dayIndex >= 0 && dayIndex < weekDates.length && timeIndex >= 0 && timeIndex < timeSlots.length) {
      return {
        date: weekDates[dayIndex],
        time: timeSlots[timeIndex]
      };
    }

    return null;
  };

  const rescheduleAppointment = async (
    appointment: Appointment & { patient: Patient; dentist: User; procedure: Procedure },
    newDate: Date,
    newTime: string
  ) => {
    // Create new scheduled date
    const [hours, minutes] = newTime.split(':').map(Number);
    const newScheduledDate = new Date(newDate);
    newScheduledDate.setHours(hours, minutes, 0, 0);

    // Check if it's the same slot
    const originalDate = new Date(appointment.scheduledDate);
    if (TimezoneUtils.isSameDay(originalDate, newScheduledDate) && 
        originalDate.getHours() === hours && 
        originalDate.getMinutes() === minutes) {
      return; // No change needed
    }

    // Check availability before updating
    try {
      const availability = await apiRequest("/api/appointments/check-availability", {
        method: "POST",
        body: { 
          dentistId: appointment.dentistId, 
          scheduledDate: TimezoneUtils.toServerTimestamp(newScheduledDate), 
          procedureId: appointment.procedureId,
          excludeId: appointment.id
        }
      });

      if (!availability.available) {
        toast({
          title: "Horário Indisponível",
          description: availability.conflictMessage || "Este horário já está ocupado",
          variant: "destructive",
        });
        return;
      }

      // Update the appointment
      await updateAppointmentMutation.mutateAsync({
        id: appointment.id,
        updates: {
          scheduledDate: TimezoneUtils.toServerTimestamp(newScheduledDate)
        }
      });

    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      toast({
        title: "Erro",
        description: "Erro ao verificar disponibilidade do horário",
        variant: "destructive",
      });
    }
  };

  const getDraggedAppointment = () => {
    if (!dragState.isDragging || !dragState.appointmentId) return null;
    return appointments.find(apt => apt.id === dragState.appointmentId);
  };

  const draggedAppointment = getDraggedAppointment();

  return (
    <div 
      ref={schedulerRef}
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Render appointments with drag capabilities */}
      {appointments.map((appointment) => (
        <div
          key={appointment.id}
          className={`absolute cursor-move transition-opacity ${
            dragState.isDragging && dragState.appointmentId === appointment.id 
              ? 'opacity-50' 
              : 'opacity-100'
          }`}
          onMouseDown={(e) => handleMouseDown(e, appointment)}
          style={{
            // Position calculation would be based on your grid layout
            // This is a simplified example
            left: `${getAppointmentPosition(appointment).x}px`,
            top: `${getAppointmentPosition(appointment).y}px`,
            width: '140px',
            height: '50px',
            zIndex: dragState.isDragging && dragState.appointmentId === appointment.id ? 1000 : 1
          }}
        >
          <div className="bg-blue-500 text-white p-2 rounded text-sm shadow-lg">
            <div className="font-medium">{appointment.patient.name}</div>
            <div className="text-xs">{appointment.procedure.name}</div>
          </div>
        </div>
      ))}

      {/* Drag preview */}
      {dragState.isDragging && draggedAppointment && (
        <div
          className="absolute pointer-events-none z-[1001] opacity-75"
          style={{
            left: `${dragState.currentPosition.x - 70}px`,
            top: `${dragState.currentPosition.y - 25}px`,
            width: '140px',
            height: '50px'
          }}
        >
          <div className="bg-blue-600 text-white p-2 rounded text-sm shadow-xl border-2 border-blue-300">
            <div className="font-medium">{draggedAppointment.patient.name}</div>
            <div className="text-xs">{draggedAppointment.procedure.name}</div>
          </div>
        </div>
      )}

      {/* Drop zones (visual feedback) */}
      {dragState.isDragging && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Grid overlay for drop zones */}
          <div className="grid grid-cols-7 gap-1 h-full">
            {weekDates.map((date, dayIndex) => (
              <div key={dayIndex} className="border-2 border-dashed border-blue-300 opacity-50 rounded">
                {timeSlots.map((time, timeIndex) => (
                  <div
                    key={`${dayIndex}-${timeIndex}`}
                    className="h-[60px] border-b border-blue-200 hover:bg-blue-50"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate appointment position in grid
function getAppointmentPosition(appointment: Appointment & { patient: Patient; dentist: User; procedure: Procedure }) {
  // This would calculate the exact position based on your grid layout
  // Simplified example - you'd need to implement based on your actual grid
  return { x: 100, y: 100 };
}