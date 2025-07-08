import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Appointment, Patient, User, Procedure } from "@/lib/types";

const appointmentSchema = z.object({
  patientId: z.number().min(1, "Paciente é obrigatório"),
  dentistId: z.number().min(1, "Dentista é obrigatório"),
  procedureIds: z.array(z.number()).min(1, "Pelo menos um procedimento é obrigatório"),
  scheduledDate: z.string().min(1, "Data e hora são obrigatórias"),
  status: z.enum(["scheduled", "confirmed", "attended", "cancelled"]).default("scheduled"),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  appointment?: Appointment | null;
  selectedDate?: string;
  selectedTime?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AppointmentForm({ appointment, selectedDate, selectedTime, onSuccess, onCancel }: AppointmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: dentists } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "dentist" }],
  });

  const { data: procedures } = useQuery<Procedure[]>({
    queryKey: ["/api/procedures"],
  });

  const getInitialScheduledDate = () => {
    if (appointment?.scheduledDate) {
      return new Date(appointment.scheduledDate).toISOString().slice(0, 16);
    }
    if (selectedDate && selectedTime) {
      return `${selectedDate}T${selectedTime}`;
    }
    return "";
  };

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: appointment?.patientId || 0,
      dentistId: appointment?.dentistId || (user?.role === "dentist" ? user.id : 0),
      procedureIds: appointment?.procedureId ? [appointment.procedureId] : [],
      scheduledDate: getInitialScheduledDate(),
      status: appointment?.status || "scheduled",
      notes: appointment?.notes || "",
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data: AppointmentFormData) => apiRequest("POST", "/api/appointments", {
      ...data,
      procedureId: data.procedureIds[0], // For now, use the first procedure
      scheduledDate: new Date(data.scheduledDate).toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Sucesso",
        description: "Agendamento criado com sucesso",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento",
        variant: "destructive",
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: (data: AppointmentFormData) => apiRequest("PUT", `/api/appointments/${appointment?.id}`, {
      ...data,
      procedureId: data.procedureIds[0], // For now, use the first procedure
      scheduledDate: new Date(data.scheduledDate).toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Sucesso",
        description: "Agendamento atualizado com sucesso",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar agendamento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    if (appointment) {
      updateAppointmentMutation.mutate(data);
    } else {
      createAppointmentMutation.mutate(data);
    }
  };

  const getStatusOptions = () => {
    const options = [
      { value: "scheduled", label: "Agendado" },
      { value: "confirmed", label: "Confirmado" },
      { value: "attended", label: "Atendido" },
      { value: "cancelled", label: "Cancelado" },
    ];

    // If editing, allow all statuses, if creating, only allow scheduled and confirmed
    return appointment ? options : options.filter(opt => ["scheduled", "confirmed"].includes(opt.value));
  };

  const formatProcedureOption = (procedure: Procedure) => {
    const duration = procedure.duration >= 60 
      ? `${Math.floor(procedure.duration / 60)}h${procedure.duration % 60 > 0 ? ` ${procedure.duration % 60}min` : ''}`
      : `${procedure.duration}min`;
    
    const price = `R$ ${Number(procedure.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    return `${procedure.name} - ${duration} - ${price}`;
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="patientId">Paciente *</Label>
          <Select 
            value={form.watch("patientId")?.toString() || ""} 
            onValueChange={(value) => form.setValue("patientId", parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar paciente" />
            </SelectTrigger>
            <SelectContent>
              {patients?.map((patient) => (
                <SelectItem key={patient.id} value={patient.id.toString()}>
                  {patient.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.patientId && (
            <p className="text-sm text-red-600">{form.formState.errors.patientId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dentistId">Dentista *</Label>
          <Select 
            value={form.watch("dentistId")?.toString() || ""} 
            onValueChange={(value) => form.setValue("dentistId", parseInt(value))}
            disabled={user?.role === "dentist"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar dentista" />
            </SelectTrigger>
            <SelectContent>
              {dentists?.map((dentist) => (
                <SelectItem key={dentist.id} value={dentist.id.toString()}>
                  {dentist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.dentistId && (
            <p className="text-sm text-red-600">{form.formState.errors.dentistId.message}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Procedimentos *</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
            {procedures?.map((procedure) => (
              <div key={procedure.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`procedure-${procedure.id}`}
                  checked={form.watch("procedureIds").includes(procedure.id)}
                  onCheckedChange={(checked) => {
                    const currentIds = form.watch("procedureIds");
                    if (checked) {
                      form.setValue("procedureIds", [...currentIds, procedure.id]);
                    } else {
                      form.setValue("procedureIds", currentIds.filter(id => id !== procedure.id));
                    }
                  }}
                />
                <Label htmlFor={`procedure-${procedure.id}`} className="text-sm cursor-pointer">
                  <div>
                    <div className="font-medium">{procedure.name}</div>
                    <div className="text-xs text-neutral-600">
                      {procedure.duration >= 60 
                        ? `${Math.floor(procedure.duration / 60)}h${procedure.duration % 60 > 0 ? ` ${procedure.duration % 60}min` : ''}`
                        : `${procedure.duration}min`} - R$ {Number(procedure.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
          {form.formState.errors.procedureIds && (
            <p className="text-sm text-red-600">{form.formState.errors.procedureIds.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduledDate">Data e Hora *</Label>
          <Input
            id="scheduledDate"
            type="datetime-local"
            {...form.register("scheduledDate")}
            min={new Date().toISOString().slice(0, 16)}
          />
          {form.formState.errors.scheduledDate && (
            <p className="text-sm text-red-600">{form.formState.errors.scheduledDate.message}</p>
          )}
        </div>

        {appointment && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={form.watch("status")} 
              onValueChange={(value) => form.setValue("status", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getStatusOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Observações sobre o agendamento"
          rows={3}
        />
      </div>

      {/* Appointment Summary */}
      {form.watch("procedureIds").length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-teal-900 mb-2">Resumo do Agendamento</h4>
          {(() => {
            const selectedProcedureIds = form.watch("procedureIds");
            const selectedProcedures = procedures?.filter(p => selectedProcedureIds.includes(p.id)) || [];
            const selectedPatient = patients?.find(p => p.id === form.watch("patientId"));
            const selectedDentist = dentists?.find(d => d.id === form.watch("dentistId"));
            
            const totalDuration = selectedProcedures.reduce((sum, p) => sum + p.duration, 0);
            const totalPrice = selectedProcedures.reduce((sum, p) => sum + Number(p.price), 0);
            
            return (
              <div className="text-sm text-teal-800 space-y-1">
                <p><strong>Paciente:</strong> {selectedPatient?.name || "Não selecionado"}</p>
                <p><strong>Dentista:</strong> {selectedDentist?.name || "Não selecionado"}</p>
                
                <div className="mt-2">
                  <p><strong>Procedimentos:</strong></p>
                  <div className="ml-4 space-y-1">
                    {selectedProcedures.map((procedure) => (
                      <div key={procedure.id} className="flex justify-between items-center">
                        <span>• {procedure.name}</span>
                        <span className="text-xs">
                          {procedure.duration >= 60 
                            ? `${Math.floor(procedure.duration / 60)}h${procedure.duration % 60 > 0 ? ` ${procedure.duration % 60}min` : ''}`
                            : `${procedure.duration}min`} - R$ {Number(procedure.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t border-teal-200 pt-2 mt-2">
                  <div className="flex justify-between items-center font-medium">
                    <span>Duração Total:</span>
                    <span>{totalDuration >= 60 
                      ? `${Math.floor(totalDuration / 60)}h${totalDuration % 60 > 0 ? ` ${totalDuration % 60}min` : ''}`
                      : `${totalDuration}min`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-medium">
                    <span>Valor Total:</span>
                    <span>R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                
                {form.watch("scheduledDate") && (
                  <p><strong>Data/Hora:</strong> {
                    new Date(form.watch("scheduledDate")).toLocaleDateString('pt-BR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  }</p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={createAppointmentMutation.isPending || updateAppointmentMutation.isPending}
        >
          {createAppointmentMutation.isPending || updateAppointmentMutation.isPending 
            ? "Salvando..." 
            : appointment ? "Atualizar" : "Agendar"
          }
        </Button>
      </div>
    </form>
  );
}
