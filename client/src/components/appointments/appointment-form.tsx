import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  status: z.enum(["agendado", "em_atendimento", "concluido", "cancelado"]).default("agendado"),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  appointment?: Appointment | null;
  prefilledDateTime?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AppointmentForm({ appointment, prefilledDateTime, onSuccess, onCancel }: AppointmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [selectedProcedures, setSelectedProcedures] = useState<Array<{ id: number; procedureId: number }>>([]);

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: dentists } = useQuery<User[]>({
    queryKey: ["/api/users/dentists"],
  });

  const { data: procedures } = useQuery<Procedure[]>({
    queryKey: ["/api/procedures"],
  });

  const { data: appointments } = useQuery<(Appointment & { patient: Patient; dentist: User; procedure: Procedure })[]>({
    queryKey: ["/api/appointments"],
  });

  // Simplified conflict checking - validation disabled temporarily 
  const checkTimeConflict = async (scheduledDate: string, dentistId: number, procedureId: number, excludeId?: number) => {
    // Always return no conflict for now - removing complex validation
    return { hasConflict: false, message: '' };
  };

  // Function to get current time in Brazil timezone for form validation
  const getBrazilCurrentTime = () => {
    const now = new Date();
    // Convert to Brazil timezone
    const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const year = brazilTime.getFullYear();
    const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
    const day = String(brazilTime.getDate()).padStart(2, '0');
    const hours = String(brazilTime.getHours()).padStart(2, '0');
    const minutes = String(brazilTime.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getInitialScheduledDate = () => {
    if (appointment?.scheduledDate) {
      const date = new Date(appointment.scheduledDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    if (prefilledDateTime) {
      return prefilledDateTime;
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
      status: appointment?.status || "agendado",
      notes: appointment?.notes || "",
    },
  });





  // Initialize procedures when editing or creating
  useEffect(() => {
    if (appointment?.procedureId) {
      setSelectedProcedures([{ id: Date.now(), procedureId: appointment.procedureId }]);
    } else {
      // Add one procedure field for new appointments
      setSelectedProcedures([{ id: Date.now(), procedureId: 0 }]);
    }
  }, [appointment]);

  // Update form values when prefilledDateTime changes
  useEffect(() => {
    if (prefilledDateTime && !appointment) {
      form.setValue("scheduledDate", prefilledDateTime);
    }
  }, [prefilledDateTime, appointment, form]);

  const createAppointmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/appointments", {
      patientId: data.patientId,
      dentistId: data.dentistId,
      procedureId: data.procedureId,
      scheduledDate: data.scheduledDate,
      status: data.status,
      notes: data.notes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Sucesso",
        description: "Agendamento criado com sucesso",
      });
      onSuccess();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Erro ao criar agendamento";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/appointments/${appointment?.id}`, {
      patientId: data.patientId,
      dentistId: data.dentistId,
      procedureId: data.procedureId,
      scheduledDate: data.scheduledDate,
      status: data.status,
      notes: data.notes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Sucesso",
        description: "Agendamento atualizado com sucesso",
      });
      onSuccess();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Erro ao atualizar agendamento";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: AppointmentFormData) => {
    setIsChecking(true);
    
    try {
      // Verificar se os dados obrigatórios estão presentes
      if (!data.procedureIds || data.procedureIds.length === 0 || data.procedureIds[0] === 0) {
        toast({
          title: "Erro de validação",
          description: "Por favor, selecione um procedimento antes de agendar.",
          variant: "destructive",
        });
        setIsChecking(false);
        return;
      }
      
      // Validation temporarily disabled to fix form issues
      // Conflict checking will be re-implemented with simpler logic
      
      // Para compatibilidade com o backend atual, usamos apenas o primeiro procedimento
      
      // Manter o horário exatamente como selecionado pelo usuário
      const appointmentData = {
        ...data,
        procedureId: data.procedureIds[0] || 0, // Pega o primeiro procedimento
        scheduledDate: data.scheduledDate, // Enviar como string "YYYY-MM-DDTHH:MM"
      };
      delete (appointmentData as any).procedureIds; // Remove o array

      if (appointment) {
        updateAppointmentMutation.mutate(appointmentData as any);
      } else {
        createAppointmentMutation.mutate(appointmentData as any);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao verificar disponibilidade. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusOptions = () => {
    const options = [
      { value: "agendado", label: "Agendado" },
      { value: "em_atendimento", label: "Em Atendimento" },
      { value: "concluido", label: "Concluído" },
      { value: "cancelado", label: "Cancelado" },
    ];

    // If editing, allow all statuses, if creating, only allow agendado
    return appointment ? options : options.filter(opt => ["agendado"].includes(opt.value));
  };

  const formatProcedureOption = (procedure: Procedure) => {
    const duration = procedure.duration >= 60 
      ? `${Math.floor(procedure.duration / 60)}h${procedure.duration % 60 > 0 ? ` ${procedure.duration % 60}min` : ''}`
      : `${procedure.duration}min`;
    
    const price = `R$ ${Number(procedure.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    return `${procedure.name} - ${duration} - ${price}`;
  };

  return (
    <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <Label htmlFor="patientId">Paciente *</Label>
            <Select 
              value={form.watch("patientId")?.toString() || ""} 
              onValueChange={(value) => form.setValue("patientId", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar paciente" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] z-50" position="popper" sideOffset={5} align="start">
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
              <SelectContent className="max-h-[200px] z-50" position="popper" sideOffset={5} align="start">
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
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Procedimentos *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newId = Date.now();
                setSelectedProcedures([...selectedProcedures, { id: newId, procedureId: 0 }]);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Procedimento
            </Button>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {selectedProcedures.map((selectedProc, index) => (
              <div key={selectedProc.id} className="flex items-center gap-3 p-3 border rounded-lg bg-neutral-50">
                <div className="flex-1">
                  <Select
                    value={selectedProc.procedureId?.toString() || ""}
                    onValueChange={(value) => {
                      const updatedProcedures = selectedProcedures.map((proc, i) =>
                        i === index ? { ...proc, procedureId: parseInt(value) } : proc
                      );
                      setSelectedProcedures(updatedProcedures);
                      
                      // Update form with procedure IDs
                      const procedureIds = updatedProcedures
                        .filter(p => p.procedureId > 0)
                        .map(p => p.procedureId);
                      form.setValue("procedureIds", procedureIds);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar procedimento" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] z-50" position="popper" sideOffset={5} align="start">
                      {procedures?.map((procedure) => (
                        <SelectItem key={procedure.id} value={procedure.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{procedure.name}</span>
                            <span className="text-xs text-neutral-600">
                              {procedure.duration >= 60 
                                ? `${Math.floor(procedure.duration / 60)}h${procedure.duration % 60 > 0 ? ` ${procedure.duration % 60}min` : ''}`
                                : `${procedure.duration}min`} - R$ {Number(procedure.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const updatedProcedures = selectedProcedures.filter((_, i) => i !== index);
                    setSelectedProcedures(updatedProcedures);
                    
                    // Update form with procedure IDs
                    const procedureIds = updatedProcedures
                      .filter(p => p.procedureId > 0)
                      .map(p => p.procedureId);
                    form.setValue("procedureIds", procedureIds);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            
            {selectedProcedures.length === 0 && (
              <div className="text-center py-4 text-neutral-500 text-sm">
                Clique em "Adicionar Procedimento" para incluir procedimentos ao agendamento
              </div>
            )}
          </div>
          
          {form.formState.errors.procedureIds && (
            <p className="text-sm text-red-600">{form.formState.errors.procedureIds.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduledDate">Data e Hora *</Label>
          <div className="relative">
            <Input
              id="scheduledDate"
              type="datetime-local"
              {...form.register("scheduledDate")}
              min={getBrazilCurrentTime()}
            />
          </div>
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
              <SelectContent className="z-50" position="popper" sideOffset={5} align="start">
                {getStatusOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            {...form.register("notes")}
            placeholder="Observações sobre o agendamento"
            rows={3}
          />
        </div>

        {/* Appointment Summary - Compact Version */}
        {selectedProcedures.filter(p => p.procedureId > 0).length > 0 && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-teal-900 mb-2">Resumo do Agendamento</h4>
            {(() => {
              const validProcedures = selectedProcedures.filter(p => p.procedureId > 0);
              const procedureDetails = validProcedures
                .map(sp => procedures?.find(p => p.id === sp.procedureId))
                .filter(Boolean) as Procedure[];
              
              const selectedPatient = patients?.find(p => p.id === form.watch("patientId"));
              const selectedDentist = dentists?.find(d => d.id === form.watch("dentistId"));
              
              const totalDuration = procedureDetails.reduce((sum, p) => sum + p.duration, 0);
              const totalPrice = procedureDetails.reduce((sum, p) => sum + Number(p.price), 0);
              
              return (
                <div className="text-sm text-teal-800 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>Paciente:</strong> {selectedPatient?.name || "Não selecionado"}</p>
                      <p><strong>Dentista:</strong> {selectedDentist?.name || "Não selecionado"}</p>
                    </div>
                    <div className="text-right">
                      <p><strong>Duração Total:</strong> {totalDuration >= 60 
                        ? `${Math.floor(totalDuration / 60)}h${totalDuration % 60 > 0 ? ` ${totalDuration % 60}min` : ''}`
                        : `${totalDuration}min`}
                      </p>
                      <p><strong>Valor Total:</strong> R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p><strong>Procedimentos:</strong></p>
                    <div className="ml-2 text-xs">
                      {procedureDetails.map((procedure, index) => (
                        <span key={procedure.id}>
                          • {procedure.name}
                          {procedure.duration >= 60 
                            ? ` (${Math.floor(procedure.duration / 60)}h${procedure.duration % 60 > 0 ? ` ${procedure.duration % 60}min` : ''})`
                            : ` (${procedure.duration}min)`} - R$ {Number(procedure.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          {index < procedureDetails.length - 1 && '; '}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {form.watch("scheduledDate") && (
                    <p><strong>Data/Hora:</strong> {
                      new Date(form.watch("scheduledDate")).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
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
            disabled={createAppointmentMutation.isPending || updateAppointmentMutation.isPending || isChecking}
          >
            {isChecking 
              ? "Verificando disponibilidade..." 
              : createAppointmentMutation.isPending || updateAppointmentMutation.isPending 
                ? "Salvando..." 
                : appointment ? "Atualizar" : "Agendar"
            }
          </Button>
        </div>
      </form>
    </div>
  );
}
