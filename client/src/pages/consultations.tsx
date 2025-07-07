import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  FileText, 
  User as UserIcon, 
  Calendar,
  Stethoscope,
  Eye,
  Edit
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Consultation, Patient, User } from "@/lib/types";

const consultationSchema = z.object({
  patientId: z.number().min(1, "Paciente é obrigatório"),
  dentistId: z.number().min(1, "Dentista é obrigatório"),
  appointmentId: z.number().optional(),
  date: z.string().min(1, "Data é obrigatória"),
  procedures: z.array(z.string()).optional(),
  clinicalNotes: z.string().optional(),
  observations: z.string().optional(),
});

type ConsultationFormData = z.infer<typeof consultationSchema>;

export default function Consultations() {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
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
    queryKey: ["/api/users", { role: "dentist" }],
  });

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      patientId: 0,
      dentistId: user?.id || 0,
      date: new Date().toISOString().split('T')[0],
      procedures: [],
      clinicalNotes: "",
      observations: "",
    },
  });

  const createConsultationMutation = useMutation({
    mutationFn: (data: ConsultationFormData) => apiRequest("POST", "/api/consultations", {
      ...data,
      date: new Date(data.date).toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      toast({
        title: "Sucesso",
        description: "Consulta registrada com sucesso",
      });
      setShowForm(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao registrar consulta",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ConsultationFormData) => {
    createConsultationMutation.mutate(data);
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
    <div className="p-6 pb-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Atendimentos</h1>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Consulta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Nova Consulta</DialogTitle>
            </DialogHeader>
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
                  <Label htmlFor="date">Data e Hora *</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    {...form.register("date")}
                  />
                  {form.formState.errors.date && (
                    <p className="text-sm text-red-600">{form.formState.errors.date.message}</p>
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

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createConsultationMutation.isPending}>
                  {createConsultationMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
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

      {/* Consultations List */}
      <div className="space-y-4">
        {filteredConsultations?.map((consultation) => (
          <Card key={consultation.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {getInitials(consultation.patient?.name || "")}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-neutral-900">
                        {consultation.patient?.name}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(consultation.date)}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-600 mb-2">
                      <Stethoscope className="w-4 h-4 inline mr-1" />
                      Atendido por: {consultation.dentist?.name}
                    </p>
                    {consultation.procedures && consultation.procedures.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-neutral-700">Procedimentos:</p>
                        <p className="text-sm text-neutral-600">{consultation.procedures.join(", ")}</p>
                      </div>
                    )}
                    {consultation.clinicalNotes && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-neutral-700">Observações Clínicas:</p>
                        <p className="text-sm text-neutral-600">{consultation.clinicalNotes}</p>
                      </div>
                    )}
                    {consultation.observations && (
                      <div>
                        <p className="text-sm font-medium text-neutral-700">Observações Gerais:</p>
                        <p className="text-sm text-neutral-600">{consultation.observations}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedConsultation(consultation)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Edit functionality would go here
                      toast({
                        title: "Em desenvolvimento",
                        description: "Funcionalidade de edição em desenvolvimento",
                      });
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!filteredConsultations || filteredConsultations.length === 0) && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600">Nenhuma consulta encontrada</p>
                <p className="text-sm text-neutral-500 mt-2">
                  {search ? "Tente ajustar os filtros de busca" : "Registre a primeira consulta"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
