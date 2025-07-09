import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  MoreHorizontal,
  Trash2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Consultation, Patient, User, Procedure } from "@/lib/types";

const consultationSchema = z.object({
  patientId: z.number().min(1, "Paciente é obrigatório"),
  dentistId: z.number().min(1, "Dentista é obrigatório"),
  appointmentId: z.number().optional(),
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().min(1, "Horário é obrigatório"),
  procedureIds: z.array(z.number()).optional(),
  clinicalNotes: z.string().optional(),
  observations: z.string().optional(),
});

type ConsultationFormData = z.infer<typeof consultationSchema>;

export default function Consultations() {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [selectedProcedures, setSelectedProcedures] = useState<Array<{ id: number; procedureId: number }>>([]);
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: consultations, isLoading: consultationsLoading } = useQuery<Consultation[]>({
    queryKey: ["/api/consultations", { 
      patientId: selectedPatient !== "all" ? parseInt(selectedPatient) : undefined,
      dentistId: user?.role === "dentist" ? user.id : undefined 
    }],
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: dentists } = useQuery<User[]>({
    queryKey: ["/api/users/dentists"],
    queryFn: async () => {
      const response = await fetch("/api/users/dentists", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch dentists");
      return response.json();
    },
  });

  const { data: procedures } = useQuery<Procedure[]>({
    queryKey: ["/api/procedures"],
  });

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
    },
  });

  // Initialize procedures when form opens
  useEffect(() => {
    if (showForm) {
      setSelectedProcedures([{ id: Date.now(), procedureId: 0 }]);
    }
  }, [showForm]);

  const createConsultationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/consultations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Sucesso",
        description: "Consulta registrada e agendamentos criados automaticamente na agenda",
      });
      setShowForm(false);
      setEditingConsultation(null);
      form.reset();
      setSelectedProcedures([]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao registrar consulta",
        variant: "destructive",
      });
    },
  });

  const deleteConsultationMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/consultations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      toast({
        title: "Sucesso",
        description: "Consulta excluída com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao excluir consulta",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ConsultationFormData) => {
    // Converte os procedimentos selecionados para nomes para compatibilidade com o backend
    const procedureNames = selectedProcedures
      .filter(sp => sp.procedureId > 0)
      .map(sp => procedures?.find(p => p.id === sp.procedureId)?.name)
      .filter(Boolean);

    // Combinar data e horário
    const dateTime = new Date(`${data.date}T${data.time}:00`);

    const consultationData = {
      ...data,
      date: dateTime.toISOString(),
      procedures: procedureNames,
    };

    // Remove campos não usados no backend
    delete (consultationData as any).procedureIds;
    delete (consultationData as any).time;

    createConsultationMutation.mutate(consultationData);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const handleDeleteConsultation = (consultation: Consultation) => {
    if (window.confirm(`Tem certeza que deseja excluir a consulta de ${consultation.patient?.name}?`)) {
      deleteConsultationMutation.mutate(consultation.id);
    }
  };

  const handleEditConsultation = (consultation: Consultation) => {
    setEditingConsultation(consultation);
    // Popular form com dados da consulta
    form.setValue("patientId", consultation.patientId);
    form.setValue("dentistId", consultation.dentistId);
    
    // Converter a data para formato ISO
    const consultationDate = new Date(consultation.date);
    form.setValue("date", consultationDate.toISOString().split('T')[0]);
    form.setValue("time", consultationDate.toTimeString().slice(0, 5));
    
    form.setValue("clinicalNotes", consultation.clinicalNotes || "");
    form.setValue("observations", consultation.observations || "");
    
    // Popular procedimentos se existirem
    if (consultation.procedures && consultation.procedures.length > 0) {
      const procedureItems = consultation.procedures.map((procName, index) => {
        const procedure = procedures?.find(p => p.name === procName);
        return {
          id: Date.now() + index,
          procedureId: procedure?.id || 0
        };
      });
      setSelectedProcedures(procedureItems);
    }
    
    setShowForm(true);
  };

  const filteredConsultations = consultations?.filter(consultation => 
    !search || 
    consultation.patient?.name.toLowerCase().includes(search.toLowerCase()) ||
    consultation.dentist?.name.toLowerCase().includes(search.toLowerCase()) ||
    consultation.procedures?.some(proc => proc.toLowerCase().includes(search.toLowerCase()))
  );

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
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Consulta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {editingConsultation ? "Editar Consulta" : "Registrar Nova Consulta"}
              </DialogTitle>
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
                    {...form.register("date")}
                  />
                  {form.formState.errors.date && (
                    <p className="text-sm text-red-600">{form.formState.errors.date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Horário *</Label>
                  <Input
                    id="time"
                    type="time"
                    {...form.register("time")}
                  />
                  {form.formState.errors.time && (
                    <p className="text-sm text-red-600">{form.formState.errors.time.message}</p>
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

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  setEditingConsultation(null);
                  form.reset();
                  setSelectedProcedures([]);
                }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createConsultationMutation.isPending}>
                  {createConsultationMutation.isPending 
                    ? "Salvando..." 
                    : editingConsultation 
                      ? "Atualizar" 
                      : "Salvar"
                  }
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
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filtrar por paciente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Pacientes</SelectItem>
                {patients?.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id.toString()}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Consultations DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Atendimentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="font-medium text-neutral-700">Paciente</TableHead>
                  <TableHead className="font-medium text-neutral-700">Data/Hora</TableHead>
                  <TableHead className="font-medium text-neutral-700">Dentista</TableHead>
                  <TableHead className="font-medium text-neutral-700">Procedimentos</TableHead>
                  <TableHead className="font-medium text-neutral-700">Observações</TableHead>
                  <TableHead className="text-center font-medium text-neutral-700">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConsultations?.map((consultation) => (
                  <TableRow key={consultation.id} className="hover:bg-neutral-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
                          {getInitials(consultation.patient?.name || "")}
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900">
                            {consultation.patient?.name}
                          </div>
                          <div className="text-sm text-neutral-500">
                            ID: #{consultation.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium text-neutral-900">
                          {new Date(consultation.date).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-neutral-600">
                          {new Date(consultation.date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="w-4 h-4 text-teal-600" />
                        <span className="text-sm font-medium text-neutral-900">
                          {consultation.dentist?.name}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-xs">
                        {consultation.procedures && consultation.procedures.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {consultation.procedures.map((procedure, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {procedure}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-500">Nenhum procedimento</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-xs">
                        {consultation.clinicalNotes ? (
                          <div className="text-sm text-neutral-700 truncate" title={consultation.clinicalNotes}>
                            {consultation.clinicalNotes}
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-500">Sem observações</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => setSelectedConsultation(consultation)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => handleEditConsultation(consultation)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer text-red-600"
                              onClick={() => handleDeleteConsultation(consultation)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {(!filteredConsultations || filteredConsultations.length === 0) && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 font-medium">Nenhuma consulta encontrada</p>
              <p className="text-sm text-neutral-500 mt-1">
                {search ? "Tente ajustar os filtros de busca" : "Registre a primeira consulta"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consultation Detail Modal */}
      <Dialog open={!!selectedConsultation} onOpenChange={() => setSelectedConsultation(null)}>
        <DialogContent className="max-w-2xl">
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
    </div>
  );
}
