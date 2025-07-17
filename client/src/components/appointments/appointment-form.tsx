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
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // Enhanced conflict checking using API
  const checkTimeConflict = async (scheduledDate: string, dentistId: number, procedureId: number, excludeId?: number) => {
    if (!scheduledDate || !dentistId || !procedureId) {
      return { hasConflict: false, message: '' };
    }
    
    try {
      const response = await apiRequest("POST", "/api/appointments/check-availability", {
        dentistId, 
        scheduledDate, 
        procedureId, 
        excludeId
      });
      
      return {
        hasConflict: !response.available,
        message: response.conflictMessage || (response.available ? '' : 'Este horário não está disponível')
      };
    } catch (error) {
      console.error("Error checking time conflict:", error);
      return { hasConflict: false, message: '' };
    }
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

  // Validação em tempo real do horário
  const watchedDate = form.watch("scheduledDate");
  const watchedDentist = form.watch("dentistId");
  const watchedProcedures = form.watch("procedureIds");

  const validateConflict = useCallback(async (date: string, dentist: number, procedure: number) => {
    if (!date || !dentist || !procedure) {
      setValidationError(null);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    
    try {
      const result = await checkTimeConflict(date, dentist, procedure, appointment?.id);
      
      if (result.hasConflict) {
        setValidationError(result.message || "Este horário não está disponível");
      } else {
        setValidationError(null);
      }
    } catch (error) {
      console.error("Erro ao verificar conflito:", error);
      setValidationError(null);
    } finally {
      setIsValidating(false);
    }
  }, [appointment?.id, checkTimeConflict]);

  useEffect(() => {
    // Clear any existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    // Reset validation state immediately
    setValidationError(null);
    setIsValidating(false);
    
    // If fields are not complete, exit early
    if (!watchedDate || !watchedDentist || !watchedProcedures || watchedProcedures.length === 0 || watchedProcedures[0] <= 0) {
      return;
    }

    // Set new timeout for validation
    validationTimeoutRef.current = setTimeout(() => {
      validateConflict(watchedDate, watchedDentist, watchedProcedures[0]);
    }, 300);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [watchedDate, watchedDentist, watchedProcedures, validateConflict]);

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

  const onSubmit = (data: AppointmentFormData) => {
    // Verificar conflito antes de submeter
    if (timeConflictError) {
      toast({
        title: "Erro",
        description: "Não é possível agendar no horário selecionado. Escolha outro horário.",
        variant: "destructive",
      });
      return;
    }
    
    // Para compatibilidade com o backend atual, usamos apenas o primeiro procedimento
    
    // Converter a data do input datetime-local para o formato correto
    // O input retorna no formato "YYYY-MM-DDTHH:MM" e precisamos tratar como hora local
    const localDate = new Date(data.scheduledDate);
    
    const appointmentData = {
      ...data,
      procedureId: data.procedureIds[0] || 0, // Pega o primeiro procedimento
      scheduledDate: localDate.toISOString(),
    };
    delete (appointmentData as any).procedureIds; // Remove o array

    if (appointment) {
      updateAppointmentMutation.mutate(appointmentData as any);
    } else {
      createAppointmentMutation.mutate(appointmentData as any);
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
              min={new Date().toISOString().slice(0, 16)}
              className={`${validationError ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50' : ''}`}
            />
            {validationError && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          {form.formState.errors.scheduledDate && (
            <p className="text-sm text-red-600">{form.formState.errors.scheduledDate.message}</p>
          )}
          {validationError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Horário não disponível
                  </h3>
                  <div className="mt-1 text-sm text-red-700">
                    {validationError}
                  </div>
                </div>
              </div>
            </div>
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
            disabled={createAppointmentMutation.isPending || updateAppointmentMutation.isPending || !!validationError}
            className={`${validationError ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {createAppointmentMutation.isPending || updateAppointmentMutation.isPending 
              ? "Salvando..." 
              : appointment ? "Atualizar" : "Agendar"
            }
          </Button>
        </div>
      </form>
    </div>
  );
}
