import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  FileText, 
  User as UserIcon, 
  Calendar,
  Stethoscope,
  Eye,
  Edit,
  X,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Trash2,
  Play,
  CheckCircle,
  DollarSign,
  RefreshCw
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyFilter } from "@/contexts/company-context";
import GenerateReceivableModal from "@/components/financial/generate-receivable-modal";
import type { Consultation, Patient, User, Procedure } from "@/lib/types";

const consultationSchema = z.object({
  patientId: z.number().min(1, "Paciente é obrigatório"),
  dentistId: z.number().min(1, "Dentista é obrigatório"),
  appointmentId: z.number().optional(),
  date: z.string().min(1, "Data é obrigatória").refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, "Não é possível agendar consultas em datas passadas"),
  time: z.string().min(1, "Horário é obrigatório"),
  procedureIds: z.array(z.number()).optional(),
  clinicalNotes: z.string().optional(),
  observations: z.string().optional(),
  status: z.enum(["agendado", "em_atendimento", "concluido", "cancelado"]).default("agendado"),
}).refine((data) => {
  // Validação adicional para verificar se a data e hora não estão no passado
  if (data.date && data.time) {
    const selectedDateTime = new Date(`${data.date}T${data.time}`);
    const now = new Date();
    
    // Adiciona uma margem de 1 minuto para evitar problemas de timing
    const nowWithMargin = new Date(now.getTime() + 60000);
    
    return selectedDateTime >= nowWithMargin;
  }
  return true;
}, {
  message: "Não é possível agendar consultas em horários passados",
  path: ["time"] // Associa o erro ao campo time
});

type ConsultationFormData = z.infer<typeof consultationSchema>;

export default function Consultations() {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [selectedProcedures, setSelectedProcedures] = useState<Array<{ id: number; procedureId: number }>>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [timeConflictError, setTimeConflictError] = useState<string>("");
  const [showGenerateReceivable, setShowGenerateReceivable] = useState(false);
  const [consultationForReceivable, setConsultationForReceivable] = useState<Consultation | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [consultationToDelete, setConsultationToDelete] = useState<Consultation | null>(null);
  const [appointmentRefreshKey, setAppointmentRefreshKey] = useState(Date.now());
  const [locallyCreatedConsultations, setLocallyCreatedConsultations] = useState<number[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId: companyFilter } = useCompanyFilter();

  // Status management functions
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
    
    if (currentStatus === "concluido") {
      actions.push({
        label: "Gerar Cobrança",
        icon: DollarSign,
        value: "generate_receivable",
        color: "text-primary"
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

  const { data: consultations, isLoading: consultationsLoading } = useQuery<Consultation[]>({
    queryKey: ["/api/consultations", { 
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      dentistId: user?.role === "dentist" ? user.id : undefined,
      companyId: companyFilter
    }],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      
      if (selectedStatus !== "all") {
        params.append('status', selectedStatus);
      }
      
      if (user?.role === "dentist") {
        params.append('dentistId', user.id.toString());
      }
      
      if (companyFilter.companyId) {
        params.append('companyId', companyFilter);
      }
      
      const url = `/api/consultations${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
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

  // Buscar agendamentos que não têm consulta correspondente - SIMPLIFICADO
  const { data: rawAppointmentsWithoutConsultation, error: appointmentsError, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments-without-consultation", { companyId: companyFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyFilter.companyId) {
        params.append('companyId', companyFilter);
      }
      const url = `/api/appointments-without-consultation${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch appointments");
      return response.json();
    },
    enabled: !!user, // Only run if user is authenticated
  });

  console.log('[DEBUG] Query state - loading:', appointmentsLoading, 'error:', appointmentsError, 'data length:', rawAppointmentsWithoutConsultation?.length || 'undefined');

  // Aplicar filtro local para remover agendamentos convertidos em consultas
  const appointmentsWithoutConsultation = rawAppointmentsWithoutConsultation?.filter(
    (appointment: any) => !locallyCreatedConsultations.includes(appointment.id)
  ) || [];

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: dentists, refetch: refetchDentists } = useQuery<User[]>({
    queryKey: ["/api/users/dentists"],
    queryFn: async () => {
      const response = await fetch("/api/users/dentists", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      if (!response.ok) throw new Error("Failed to fetch dentists");
      return response.json();
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache
  });

  const { data: procedures } = useQuery<Procedure[]>({
    queryKey: ["/api/procedures"],
  });

  // Query para buscar agendamentos
  const { data: appointments } = useQuery({
    queryKey: ["/api/appointments", { companyId: companyFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyFilter.companyId) {
        params.append('companyId', companyFilter);
      }
      const url = `/api/appointments${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch appointments");
      return response.json();
    },
  });

  // Function to handle delete consultation
  const handleDeleteConsultation = (consultation: Consultation) => {
    setConsultationToDelete(consultation);
    setShowDeleteConfirmation(true);
  };

  // Function to confirm deletion
  const confirmDeleteConsultation = () => {
    if (consultationToDelete) {
      deleteConsultationMutation.mutate(consultationToDelete.id);
    }
  };

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      patientId: 0,
      dentistId: user?.id || 0,
      date: new Date().toISOString().split('T')[0],
      time: "09:00",
      procedureIds: [],
      clinicalNotes: "",
      observations: "",
      status: "agendado",
    },
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: number; status: string }) =>
      apiRequest("PUT", `/api/consultations/${data.id}`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments-without-consultation"] });
      toast({
        title: "Sucesso",
        description: "Status do atendimento atualizado",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  // Delete consultation mutation
  const deleteConsultationMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/consultations/${id}`),
    onSuccess: () => {
      // Incrementar a chave de refresh para mostrar agendamento novamente
      setAppointmentRefreshKey(prev => prev + 1);
      
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowDeleteConfirmation(false);
      setConsultationToDelete(null);
      toast({
        title: "Sucesso",
        description: "Consulta excluída com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir consulta",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (consultationId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: consultationId, status: newStatus });
  };

  const handleActionClick = (consultation: Consultation, actionValue: string) => {
    if (actionValue === "generate_receivable") {
      setConsultationForReceivable(consultation);
      setShowGenerateReceivable(true);
    } else {
      handleStatusChange(consultation.id, actionValue);
    }
  };

  // Função para validar conflito de horários
  const validateTimeConflict = (date: string, time: string, dentistId: number, excludeConsultationId?: number) => {
    if (!appointments || !date || !time || !dentistId) {
      setTimeConflictError("");
      return false;
    }

    const selectedDateTime = new Date(`${date}T${time}`);
    const selectedTime = selectedDateTime.getTime();

    // Verifica se existe conflito com agendamentos existentes
    const conflictingAppointment = appointments.find((apt: any) => {
      const aptDate = new Date(apt.scheduledDate);
      const aptStartTime = aptDate.getTime();
      const aptEndTime = aptStartTime + (apt.procedure.duration * 60 * 1000);
      
      // Verifica se é o mesmo dentista
      if (apt.dentistId !== dentistId) return false;
      
      // Se estamos editando, ignora a consulta atual
      if (excludeConsultationId && apt.consultationId === excludeConsultationId) return false;
      
      // IMPORTANTE: Para consultas, não bloqueamos se o agendamento já existe
      // Verifica se o horário selecionado está dentro do período do agendamento
      // Mas permite se o status do agendamento for "agendado" (pode ser convertido em consulta)
      if (apt.status === "agendado") {
        return false; // Permite criar consulta para agendamentos existentes
      }
      
      return selectedTime >= aptStartTime && selectedTime < aptEndTime;
    });

    if (conflictingAppointment) {
      const conflictStart = new Date(conflictingAppointment.scheduledDate);
      const conflictEnd = new Date(conflictStart.getTime() + (conflictingAppointment.procedure.duration * 60 * 1000));
      
      setTimeConflictError(
        `Horário ocupado pelo procedimento "${conflictingAppointment.procedure.name}" que vai das ${conflictStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${conflictEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
      );
      return true;
    }

    setTimeConflictError("");
    return false;
  };

  // Initialize procedures when form opens (only if not from appointment)
  useEffect(() => {
    if (showForm && !form.getValues("appointmentId")) {
      setSelectedProcedures([{ id: Date.now(), procedureId: 0 }]);
      setTimeConflictError(""); // Limpar erros de conflito ao abrir o formulário
    }
  }, [showForm, form]);

  // Initialize procedures when edit form opens
  useEffect(() => {
    if (showEditForm) {
      setSelectedProcedures([{ id: Date.now(), procedureId: 0 }]);
      setTimeConflictError(""); // Limpar erros de conflito ao abrir o formulário de edição
    }
  }, [showEditForm]);

  // Effect to handle procedures when consultation form is opened from appointment
  useEffect(() => {
    if (showForm && form.getValues("appointmentId") && procedures) {
      const procedureIds = form.getValues("procedureIds") || [];
      
      if (procedureIds.length > 0) {
        const proceduresWithIds = procedureIds.map((id, index) => ({ 
          id: Date.now() + index, 
          procedureId: id 
        }));
        setSelectedProcedures(proceduresWithIds);
      }
    }
  }, [showForm, form, procedures]);

  const createConsultationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/consultations", data),
    onSuccess: (_, variables) => {
      toast({
        title: "Sucesso",
        description: "Consulta registrada com sucesso",
      });
      
      // SOLUÇÃO DEFINITIVA: Remover agendamento localmente de forma imediata
      if (variables.appointmentId) {
        setLocallyCreatedConsultations(prev => [...prev, variables.appointmentId]);
      }
      
      // NUCLEAR CACHE CLEARING - Garantir atualização completa
      queryClient.clear(); // Remove todos os dados do cache
      
      // Forçar revalidação imediata
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/appointments-without-consultation"] });
        queryClient.refetchQueries({ queryKey: ["/api/consultations"] });
      }, 100);
      
      setShowForm(false);
      form.reset();
      setSelectedProcedures([]);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Erro ao registrar consulta";
      toast({
        title: "Erro ao registrar consulta",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Função para criar consulta a partir de um agendamento
  const createConsultationFromAppointment = (appointment: any) => {
    // Force refetch dentists to ensure fresh data
    refetchDentists();
    
    // CORRIGIDO: Tratar corretamente o horário sem conversão de fuso horário
    const scheduledDateStr = appointment.scheduledDate;
    let dateStr, timeStr;
    
    if (scheduledDateStr.includes('T')) {
      // Extrair data e hora diretamente da string ISO sem conversão
      const [datePart, timePart] = scheduledDateStr.split('T');
      dateStr = datePart;
      // Extrair apenas HH:MM sem segundos/timezone
      timeStr = timePart.substring(0, 5); // Pega apenas HH:MM
    } else {
      // Se não estiver em formato ISO, tentar parser direto
      const parts = scheduledDateStr.split(' ');
      if (parts.length >= 2) {
        // Formato: "YYYY-MM-DD HH:MM:SS" ou similar
        dateStr = parts[0];
        timeStr = parts[1].substring(0, 5); // Pega apenas HH:MM
      } else {
        // Fallback mais seguro - usar Date mas manter horário local
        const appointmentDate = new Date(appointment.scheduledDate);
        dateStr = appointmentDate.getFullYear() + '-' + 
                  String(appointmentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(appointmentDate.getDate()).padStart(2, '0');
        timeStr = String(appointmentDate.getHours()).padStart(2, '0') + ':' + 
                  String(appointmentDate.getMinutes()).padStart(2, '0');
      }
    }

    form.reset({
      patientId: appointment.patientId,
      dentistId: appointment.dentistId,
      appointmentId: appointment.id,
      date: dateStr,
      time: timeStr,
      procedureIds: appointment.procedureId ? [appointment.procedureId] : [],
      clinicalNotes: "",
      observations: appointment.notes || "",
      status: appointment.status || "agendado",
    });

    // Definir procedimentos selecionados
    if (appointment.procedureId) {
      setSelectedProcedures([{ id: 1, procedureId: appointment.procedureId }]);
    } else {
      setSelectedProcedures([{ id: 1, procedureId: 0 }]);
    }

    setShowForm(true);
  };

  const updateConsultationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/consultations/${editingConsultation?.id}`, data),
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Consulta atualizada com sucesso",
      });
      
      // NUCLEAR CACHE CLEARING - Garantir atualização completa
      queryClient.clear(); // Remove todos os dados do cache
      
      // Forçar revalidação imediata
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/appointments-without-consultation"] });
        queryClient.refetchQueries({ queryKey: ["/api/consultations"] });
      }, 100);
      
      setShowEditForm(false);
      setEditingConsultation(null);
      form.reset();
      setSelectedProcedures([]);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Erro ao atualizar consulta";
      toast({
        title: "Erro ao atualizar consulta",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ConsultationFormData) => {
    console.log("Form submission started", data);
    console.log("Form errors:", form.formState.errors);
    
    // Validar se a data e hora não estão no passado
    const selectedDateTime = new Date(`${data.date}T${data.time}`);
    const now = new Date();
    
    // Adiciona uma margem de 1 minuto para evitar problemas de timing
    const nowWithMargin = new Date(now.getTime() + 60000);
    
    if (selectedDateTime < nowWithMargin) {
      console.log("Date/time validation failed");
      toast({
        title: "Horário inválido",
        description: "Não é possível agendar consultas em horários passados. Por favor, selecione uma data e horário futuros.",
        variant: "destructive",
      });
      return;
    }

    // Para consultas, não validamos conflito de horários pois elas podem coexistir com agendamentos
    // A validação de conflito é mais relevante para agendamentos do que para consultas
    console.log("Skipping time conflict validation for consultations");

    // Converte os procedimentos selecionados para nomes para compatibilidade com o backend
    const procedureNames = selectedProcedures
      .filter(sp => sp.procedureId > 0)
      .map(sp => procedures?.find(p => p.id === sp.procedureId)?.name)
      .filter(Boolean);

    // CORRIGIDO: Combinar data e horário sem conversão de timezone
    // Envia a data/hora como string ISO diretamente, sem criar objeto Date
    const dateTimeString = `${data.date}T${data.time}:00`;

    const consultationData = {
      ...data,
      date: dateTimeString, // Envia como string diretamente
      procedures: procedureNames,
    };

    // Remove campos não usados no backend
    delete (consultationData as any).procedureIds;
    delete (consultationData as any).time;

    console.log("Sending consultation data:", consultationData);

    // Verifica se estamos editando ou criando uma nova consulta
    if (editingConsultation) {
      updateConsultationMutation.mutate(consultationData);
    } else {
      createConsultationMutation.mutate(consultationData);
    }
  };

  const formatDate = (date: string) => {
    // Simple approach: just extract date part and format
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    // Extract time from ISO string directly to avoid timezone conversion
    const isoString = date;
    if (isoString.includes('T')) {
      const timePart = isoString.split('T')[1];
      if (timePart) {
        const timeOnly = timePart.split(':').slice(0, 2).join(':');
        return timeOnly;
      }
    }
    // Fallback: create date with explicit timezone
    const dateObj = new Date(date);
    const hours = dateObj.getUTCHours().toString().padStart(2, '0');
    const minutes = dateObj.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const toggleRowExpansion = (consultationId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(consultationId)) {
      newExpanded.delete(consultationId);
    } else {
      newExpanded.add(consultationId);
    }
    setExpandedRows(newExpanded);
  };

  const openEditForm = (consultation: Consultation) => {
    setEditingConsultation(consultation);
    
    // Preenche o formulário com os dados da consulta
    // Extract time directly from ISO string to avoid timezone conversion
    const isoDate = consultation.date;
    let timeValue = "09:00";
    
    if (isoDate.includes('T')) {
      const timePart = isoDate.split('T')[1];
      if (timePart) {
        timeValue = timePart.split(':').slice(0, 2).join(':');
      }
    }
    
    form.reset({
      patientId: consultation.patientId,
      dentistId: consultation.dentistId,
      appointmentId: consultation.appointmentId,
      date: isoDate.split('T')[0],
      time: timeValue,
      procedureIds: [],
      clinicalNotes: consultation.clinicalNotes || "",
      observations: consultation.observations || "",
      status: consultation.status || "agendado",
    });

    setShowEditForm(true);
  };

  // Efeito para configurar os procedimentos quando o modal de edição abre e os dados estão disponíveis
  useEffect(() => {
    if (showEditForm && editingConsultation && procedures) {
      // Configura os procedimentos selecionados
      if (editingConsultation.procedures && editingConsultation.procedures.length > 0) {
        const proceduresWithIds = editingConsultation.procedures.map((procName, index) => {
          const procedure = procedures.find(p => p.name === procName);
          return { id: Date.now() + index, procedureId: procedure?.id || 0 };
        });
        setSelectedProcedures(proceduresWithIds);
        
        // Atualiza o formulário com os IDs dos procedimentos
        const procedureIds = proceduresWithIds
          .filter(p => p.procedureId > 0)
          .map(p => p.procedureId);
        form.setValue("procedureIds", procedureIds);
      } else {
        setSelectedProcedures([{ id: Date.now(), procedureId: 0 }]);
      }
    }
  }, [showEditForm, editingConsultation, procedures, form]);

  // Efeito para validar conflito de horários em tempo real
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "date" || name === "time" || name === "dentistId") {
        const date = value.date;
        const time = value.time;
        const dentistId = value.dentistId;
        
        if (date && time && dentistId) {
          validateTimeConflict(date, time, dentistId, editingConsultation?.id);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, appointments, editingConsultation]);

  const filteredConsultations = consultations?.filter(consultation => {
    const matchesSearch = !search || 
      consultation.patient?.name.toLowerCase().includes(search.toLowerCase()) ||
      consultation.dentist?.name.toLowerCase().includes(search.toLowerCase()) ||
      consultation.procedures?.some(proc => proc.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = selectedStatus === "all" || consultation.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Filtrar agendamentos sem consulta - CORRIGIDO: agendamentos não têm filtro de status como consultas
  const filteredAppointmentsWithoutConsultation = appointmentsWithoutConsultation?.filter(appointment => {
    const matchesSearch = !search || 
      appointment.patient?.name.toLowerCase().includes(search.toLowerCase()) ||
      appointment.dentist?.name.toLowerCase().includes(search.toLowerCase()) ||
      appointment.procedure?.name.toLowerCase().includes(search.toLowerCase());
    
    // IMPORTANTE: Agendamentos pendentes não devem ser filtrados por status como as consultas
    // Eles são sempre exibidos pois precisam ser convertidos em consultas
    return matchesSearch;
  }) || [];

  console.log('[DEBUG] Search term:', search);
  console.log('[DEBUG] Selected status:', selectedStatus);
  console.log('[DEBUG] Sample appointment for filtering:', appointmentsWithoutConsultation?.[0]);
  console.log('[DEBUG] appointmentsWithoutConsultation full array:', appointmentsWithoutConsultation);
  console.log('[DEBUG] rawAppointmentsWithoutConsultation full array:', rawAppointmentsWithoutConsultation);

  // Paginação para consultas (histórico)
  const consultationsPagination = usePagination({
    data: filteredConsultations,
    itemsPerPage: 10,
  });

  // Paginação para agendamentos sem consulta (mais itens por página pois são prioritários)
  const appointmentsPagination = usePagination({
    data: filteredAppointmentsWithoutConsultation,
    itemsPerPage: 5,
  });

  // Debug logging para entender o problema
  console.log('[DEBUG] Filtered appointments without consultation:', filteredAppointmentsWithoutConsultation?.length || 0);
  console.log('[DEBUG] Appointments pagination currentData:', appointmentsPagination.currentData?.length || 0);
  console.log('[DEBUG] Raw appointments:', rawAppointmentsWithoutConsultation?.length || 0);
  console.log('[DEBUG] LocallyCreatedConsultations:', locallyCreatedConsultations);

  if (consultationsLoading) {
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
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Atendimentos</h1>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              // Force refetch dentists when opening new consultation modal
              refetchDentists();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Consulta
            </Button>
          </DialogTrigger>
          <DialogContent className="!max-w-6xl w-full !max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nova Consulta</DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
              <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.log("Form validation errors:", errors);
                toast({
                  title: "Erro de validação",
                  description: "Verifique os campos obrigatórios",
                  variant: "destructive",
                });
              })} className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    {...form.register("date")}
                    className={form.formState.errors.date ? "border-red-500" : ""}
                  />
                  {form.formState.errors.date && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      {form.formState.errors.date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Horário *</Label>
                  <Input
                    id="time"
                    type="time"
                    {...form.register("time")}
                    className={timeConflictError || form.formState.errors.time ? "border-red-500" : ""}
                  />
                  {form.formState.errors.time && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      {form.formState.errors.time.message}
                    </p>
                  )}
                  {timeConflictError && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      {timeConflictError}
                    </p>
                  )}
                </div>
              </div>

              {/* Procedures Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Procedimentos Realizados</Label>
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
                
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
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
                            {procedures?.filter(p => p.isActive).map((procedure) => (
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
                      {selectedProcedures.length > 1 && (
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
                      )}
                    </div>
                  ))}
                  
                  {selectedProcedures.length === 0 && (
                    <div className="text-center py-4 text-neutral-500 text-sm">
                      Clique em "Adicionar Procedimento" para incluir procedimentos realizados
                    </div>
                  )}
                </div>
                
                {/* Resumo dos Procedimentos */}
                {selectedProcedures.some(p => p.procedureId > 0) && (
                  <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                    <h4 className="font-medium text-teal-800 mb-2">Resumo dos Procedimentos</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-teal-700">Duração Total:</span>
                        <div className="font-medium text-teal-800">
                          {(() => {
                            const totalDuration = selectedProcedures
                              .filter(sp => sp.procedureId > 0)
                              .reduce((total, sp) => {
                                const procedure = procedures?.find(p => p.id === sp.procedureId);
                                return total + (procedure?.duration || 0);
                              }, 0);
                            return totalDuration >= 60 
                              ? `${Math.floor(totalDuration / 60)}h${totalDuration % 60 > 0 ? ` ${totalDuration % 60}min` : ''}`
                              : `${totalDuration}min`;
                          })()}
                        </div>
                      </div>
                      <div>
                        <span className="text-teal-700">Valor Total:</span>
                        <div className="font-medium text-teal-800">
                          R$ {selectedProcedures
                            .filter(sp => sp.procedureId > 0)
                            .reduce((total, sp) => {
                              const procedure = procedures?.find(p => p.id === sp.procedureId);
                              return total + Number(procedure?.price || 0);
                            }, 0)
                            .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-teal-600">
                      ℹ️ Os agendamentos serão criados automaticamente na agenda com base nos horários e duração dos procedimentos
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicalNotes">Observações Clínicas</Label>
                <Textarea
                  id="clinicalNotes"
                  {...form.register("clinicalNotes")}
                  placeholder="Descreva os procedimentos realizados e observações clínicas"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações Gerais</Label>
                <Textarea
                  id="observations"
                  {...form.register("observations")}
                  placeholder="Observações gerais sobre a consulta"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status da Consulta</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => form.setValue("status", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createConsultationMutation.isPending}>
                  {createConsultationMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Buscar por paciente, dentista ou procedimento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Consultations Table - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-24">Identificador</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Dentista</TableHead>
                  <TableHead>Procedimentos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Agendamentos sem consulta */}
                {appointmentsPagination.currentData.map((appointment) => (
                  <TableRow key={`appointment-${appointment.id}`} className="hover:bg-neutral-50 bg-yellow-50 border-l-4 border-yellow-400">
                    <TableCell>
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {getInitials(appointment.patient?.name || "")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-yellow-600 font-mono">
                        PENDENTE
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-neutral-900">
                          {appointment.patient?.name}
                        </span>
                        <span className="text-sm text-neutral-600">
                          {appointment.patient?.cpf}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-neutral-900">
                          {formatDate(appointment.scheduledDate)}
                        </span>
                        <span className="text-sm text-neutral-600">
                          {formatTime(appointment.scheduledDate)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-900">{appointment.dentist?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-neutral-900">
                          {appointment.procedure?.name || "Consulta geral"}
                        </span>
                        <span className="text-xs text-yellow-600 font-medium">
                          🔔 Agendamento sem consulta
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="secondary" 
                          className="bg-yellow-100 text-yellow-800 border-yellow-300"
                        >
                          Pendente
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => createConsultationFromAppointment(appointment)}
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-2"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Consultas existentes */}
                {consultationsPagination.currentData.map((consultation) => (
                  <React.Fragment key={consultation.id}>
                    <TableRow key={consultation.id} className="hover:bg-neutral-50">
                      <TableCell>
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(consultation.patient?.name || "")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono font-semibold text-primary">
                          {(consultation as any).attendanceNumber || "------"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-neutral-900">
                            {consultation.patient?.name}
                          </span>
                          <span className="text-sm text-neutral-600">
                            {consultation.patient?.cpf}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-neutral-900">
                            {formatDate(consultation.date)}
                          </span>
                          <span className="text-sm text-neutral-600">
                            {formatTime(consultation.date)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Stethoscope className="w-4 h-4 text-neutral-500" />
                          <span className="text-neutral-900">{consultation.dentist?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-neutral-900">
                            {consultation.procedures && consultation.procedures.length > 0 
                              ? consultation.procedures.join(", ") 
                              : "Consulta geral"}
                          </span>
                          {(consultation.clinicalNotes || consultation.observations) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(consultation.id)}
                              className="text-xs text-neutral-600 hover:text-neutral-900 p-0 h-auto justify-start mt-1"
                            >
                              {expandedRows.has(consultation.id) ? (
                                <>
                                  <ChevronUp className="w-3 h-3 mr-1" />
                                  Ocultar observações
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3 mr-1" />
                                  Ver observações
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="secondary" 
                            className={`${getStatusColor(consultation.status || 'agendado')} text-white border-0`}
                          >
                            {getStatusLabel(consultation.status || 'agendado')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {getStatusActions(consultation.status || 'agendado').map((action) => (
                              <DropdownMenuItem 
                                key={action.value}
                                onClick={() => handleActionClick(consultation, action.value)}
                                className={`${action.color} cursor-pointer`}
                              >
                                <action.icon className="w-4 h-4 mr-2" />
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem onClick={() => setSelectedConsultation(consultation)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditForm(consultation)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteConsultation(consultation)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(consultation.id) && (
                      <TableRow className="bg-neutral-50">
                        <TableCell colSpan={8}>
                          <div className="py-4 px-6 space-y-3">
                            {consultation.clinicalNotes && (
                              <div>
                                <Label className="text-sm font-medium text-neutral-700 mb-1 block">
                                  Observações Clínicas:
                                </Label>
                                <p className="text-sm text-neutral-900 bg-white p-3 rounded-lg border">
                                  {consultation.clinicalNotes}
                                </p>
                              </div>
                            )}
                            {consultation.observations && (
                              <div>
                                <Label className="text-sm font-medium text-neutral-700 mb-1 block">
                                  Observações Gerais:
                                </Label>
                                <p className="text-sm text-neutral-900 bg-white p-3 rounded-lg border">
                                  {consultation.observations}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Seção de Navegação e Paginação */}
          <div className="border-t bg-gray-50">
            {/* Agendamentos sem consulta - Seção destacada */}
            {filteredAppointmentsWithoutConsultation && filteredAppointmentsWithoutConsultation.length > 0 && (
              <div className="px-6 py-4 border-b bg-yellow-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-yellow-800">
                      Agendamentos Pendentes de Consulta ({filteredAppointmentsWithoutConsultation.length})
                    </h4>
                  </div>
                  <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                    Necessitam atenção
                  </div>
                </div>
                <TablePagination
                  currentPage={appointmentsPagination.currentPage}
                  totalPages={appointmentsPagination.totalPages}
                  onPageChange={appointmentsPagination.goToPage}
                  canGoPrevious={appointmentsPagination.canGoPrevious}
                  canGoNext={appointmentsPagination.canGoNext}
                  startIndex={appointmentsPagination.startIndex}
                  endIndex={appointmentsPagination.endIndex}
                  totalItems={appointmentsPagination.totalItems}
                />
              </div>
            )}
            
            {/* Consultas realizadas - Seção principal */}
            {filteredConsultations && filteredConsultations.length > 0 && (
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-800">
                      Consultas Realizadas ({filteredConsultations.length})
                    </h4>
                  </div>
                  <div className="text-xs text-gray-600">
                    Histórico de atendimentos
                  </div>
                </div>
                <TablePagination
                  currentPage={consultationsPagination.currentPage}
                  totalPages={consultationsPagination.totalPages}
                  onPageChange={consultationsPagination.goToPage}
                  canGoPrevious={consultationsPagination.canGoPrevious}
                  canGoNext={consultationsPagination.canGoNext}
                  startIndex={consultationsPagination.startIndex}
                  endIndex={consultationsPagination.endIndex}
                  totalItems={consultationsPagination.totalItems}
                />
              </div>
            )}
            
            {/* Resumo geral - sempre visível */}
            <div className="px-6 py-3 bg-gray-100 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>
                    📅 Total de agendamentos: {appointmentsPagination.totalItems}
                  </span>
                  <span>
                    ✅ Total de consultas: {consultationsPagination.totalItems}
                  </span>
                </div>
                <div className="text-gray-500">
                  Use Ctrl + F para buscar rapidamente
                </div>
              </div>
            </div>
          </div>
          
          {(!filteredConsultations || filteredConsultations.length === 0) && 
           (!filteredAppointmentsWithoutConsultation || filteredAppointmentsWithoutConsultation.length === 0) && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600">Nenhuma consulta encontrada</p>
              <p className="text-sm text-neutral-500 mt-2">
                {search ? "Tente ajustar os filtros de busca" : "Registre a primeira consulta"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consultations Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {/* Agendamentos sem consulta (consultas pendentes) */}
        {filteredAppointmentsWithoutConsultation?.map((appointment) => (
          <Card key={`appointment-${appointment.id}`} className="border-l-4 border-yellow-400 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {getInitials(appointment.patient?.name || "")}
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900">
                      {appointment.patient?.name}
                    </div>
                    <div className="text-sm text-neutral-600">
                      {appointment.patient?.cpf}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-yellow-100 text-yellow-800 border-yellow-300"
                >
                  Pendente
                </Badge>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Data/Hora:</span>
                  <span className="font-medium">
                    {formatDate(appointment.scheduledDate)} - {formatTime(appointment.scheduledDate)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Dentista:</span>
                  <span className="font-medium">{appointment.dentist?.name}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Procedimento:</span>
                  <span className="font-medium">{appointment.procedure?.name || "Consulta geral"}</span>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={() => createConsultationFromAppointment(appointment)}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Criar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Consultas existentes */}
        {filteredConsultations?.map((consultation) => (
          <Card key={consultation.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {getInitials(consultation.patient?.name || "")}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                        #{(consultation as any).attendanceNumber || "------"}
                      </span>
                    </div>
                    <div className="font-medium text-neutral-900">
                      {consultation.patient?.name}
                    </div>
                    <div className="text-sm text-neutral-600">
                      {consultation.patient?.cpf}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className={getStatusColor(consultation.status || 'agendado')}
                >
                  {getStatusLabel(consultation.status || 'agendado')}
                </Badge>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Data/Hora:</span>
                  <span className="font-medium">
                    {formatDate(consultation.date)} - {formatTime(consultation.date)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Dentista:</span>
                  <span className="font-medium">{consultation.dentist?.name}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Procedimentos:</span>
                  <span className="font-medium text-right max-w-[50%]">
                    {consultation.procedures && consultation.procedures.length > 0 
                      ? consultation.procedures.join(", ") 
                      : "Consulta geral"}
                  </span>
                </div>
              </div>
              
              {(consultation.clinicalNotes || consultation.observations) && (
                <div className="mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRowExpansion(consultation.id)}
                    className="text-xs text-neutral-600 hover:text-neutral-900 p-0 h-auto justify-start"
                  >
                    {expandedRows.has(consultation.id) ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Ocultar observações
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Ver observações
                      </>
                    )}
                  </Button>
                  
                  {expandedRows.has(consultation.id) && (
                    <div className="mt-2 p-3 bg-neutral-50 rounded-md">
                      {consultation.clinicalNotes && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-neutral-700 mb-1">
                            Observações Clínicas:
                          </div>
                          <div className="text-sm text-neutral-600">
                            {consultation.clinicalNotes}
                          </div>
                        </div>
                      )}
                      {consultation.observations && (
                        <div>
                          <div className="text-xs font-medium text-neutral-700 mb-1">
                            Observações Gerais:
                          </div>
                          <div className="text-sm text-neutral-600">
                            {consultation.observations}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {getStatusActions(consultation.status || 'agendado').map((action) => (
                      <DropdownMenuItem 
                        key={action.value}
                        onClick={() => handleActionClick(consultation, action.value)}
                        className={`${action.color} cursor-pointer`}
                      >
                        <action.icon className="w-4 h-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={() => setSelectedConsultation(consultation)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditForm(consultation)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteConsultation(consultation)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Empty state */}
        {(!filteredConsultations || filteredConsultations.length === 0) && 
         (!filteredAppointmentsWithoutConsultation || filteredAppointmentsWithoutConsultation.length === 0) && (
          <Card>
            <CardContent className="text-center py-8">
              <Stethoscope className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Nenhum atendimento encontrado
              </h3>
              <p className="text-neutral-600 mb-4">
                Não há atendimentos que correspondam aos filtros aplicados.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Registrar Primeira Consulta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Consultation Detail Modal */}
      <Dialog open={!!selectedConsultation} onOpenChange={() => setSelectedConsultation(null)}>
        <DialogContent className="!max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>Detalhes da Consulta</DialogTitle>
          </DialogHeader>
          {selectedConsultation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-neutral-700">Paciente</Label>
                  <p className="text-sm text-neutral-900">{selectedConsultation.patient?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-neutral-700">Dentista</Label>
                  <p className="text-sm text-neutral-900">{selectedConsultation.dentist?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-neutral-700">Data</Label>
                  <p className="text-sm text-neutral-900">{formatDate(selectedConsultation.date)}</p>
                </div>
              </div>
              
              {selectedConsultation.procedures && selectedConsultation.procedures.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-neutral-700">Procedimentos</Label>
                  <p className="text-sm text-neutral-900">{selectedConsultation.procedures.join(", ")}</p>
                </div>
              )}
              
              {selectedConsultation.clinicalNotes && (
                <div>
                  <Label className="text-sm font-medium text-neutral-700">Observações Clínicas</Label>
                  <p className="text-sm text-neutral-900">{selectedConsultation.clinicalNotes}</p>
                </div>
              )}
              
              {selectedConsultation.observations && (
                <div>
                  <Label className="text-sm font-medium text-neutral-700">Observações Gerais</Label>
                  <p className="text-sm text-neutral-900">{selectedConsultation.observations}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Consultation Modal */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="!max-w-6xl w-full !max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Consulta</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
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

              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  {...form.register("date")}
                  className={form.formState.errors.date ? "border-red-500" : ""}
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Horário *</Label>
                <Input
                  id="time"
                  type="time"
                  {...form.register("time")}
                  className={timeConflictError || form.formState.errors.time ? "border-red-500" : ""}
                />
                {form.formState.errors.time && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {form.formState.errors.time.message}
                  </p>
                )}
                {timeConflictError && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {timeConflictError}
                  </p>
                )}
              </div>
            </div>

            {/* Procedures Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Procedimentos Realizados</Label>
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
              
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
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
                          {procedures?.filter(p => p.isActive).map((procedure) => (
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
                    {selectedProcedures.length > 1 && (
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
                    )}
                  </div>
                ))}
                
                {selectedProcedures.length === 0 && (
                  <div className="text-center py-4 text-neutral-500 text-sm">
                    Clique em "Adicionar Procedimento" para incluir procedimentos realizados
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicalNotes">Observações Clínicas</Label>
              <Textarea
                id="clinicalNotes"
                {...form.register("clinicalNotes")}
                placeholder="Descreva os procedimentos realizados e observações clínicas"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações Gerais</Label>
              <Textarea
                id="observations"
                {...form.register("observations")}
                placeholder="Observações gerais sobre a consulta"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status da Consulta</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => form.setValue("status", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setShowEditForm(false);
                setEditingConsultation(null);
              }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateConsultationMutation.isPending}>
                {updateConsultationMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Receivable Modal */}
      <GenerateReceivableModal
        consultation={consultationForReceivable}
        open={showGenerateReceivable}
        onOpenChange={(open) => {
          setShowGenerateReceivable(open);
          if (!open) {
            setConsultationForReceivable(null);
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Tem certeza que deseja excluir esta consulta? Esta ação não pode ser desfeita.
            </p>
            {consultationToDelete && (
              <div className="bg-neutral-50 p-3 rounded-lg border">
                <p className="text-sm">
                  <strong>Paciente:</strong> {consultationToDelete.patient?.name}
                </p>
                <p className="text-sm">
                  <strong>Data:</strong> {formatDate(consultationToDelete.date)}
                </p>
                <p className="text-sm">
                  <strong>Dentista:</strong> {consultationToDelete.dentist?.name}
                </p>
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setConsultationToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={confirmDeleteConsultation}
                disabled={deleteConsultationMutation.isPending}
              >
                {deleteConsultationMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
