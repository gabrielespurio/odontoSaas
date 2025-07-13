import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  CalendarPlus, 
  Wrench, 
  ClipboardList, 
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Edit
} from "lucide-react";
import Odontogram from "@/components/dental-chart/odontogram";
import AnamneseForm from "@/components/patients/anamnese-form";
import type { Patient, Consultation, Financial } from "@/lib/types";

const patientEditSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().min(11, "CPF é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  // Structured address fields
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional(),
  clinicalNotes: z.string().optional(),
});

type PatientEditData = z.infer<typeof patientEditSchema>;

export default function PatientDetail() {
  const { id } = useParams();
  const patientId = parseInt(id || "0");
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  
  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: [`/api/patients/${patientId}`],
    enabled: !!patientId,
  });

  const { data: consultations, isLoading: consultationsLoading } = useQuery<Consultation[]>({
    queryKey: [`/api/consultations`, { patientId }],
    enabled: !!patientId,
  });

  const { data: financial, isLoading: financialLoading } = useQuery<Financial[]>({
    queryKey: [`/api/financial`, { patientId }],
    enabled: !!patientId,
  });

  const form = useForm<PatientEditData>({
    resolver: zodResolver(patientEditSchema),
    defaultValues: {
      name: patient?.name || "",
      cpf: patient?.cpf || "",
      birthDate: patient?.birthDate || "",
      phone: patient?.phone || "",
      email: patient?.email || "",
      cep: patient?.cep || "",
      street: patient?.street || "",
      number: patient?.number || "",
      neighborhood: patient?.neighborhood || "",
      city: patient?.city || "",
      state: patient?.state || "",
      address: patient?.address || "",
      clinicalNotes: patient?.clinicalNotes || "",
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: (data: PatientEditData) => 
      apiRequest("PUT", `/api/patients/${patientId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
      setIsEditing(false);
      toast({
        title: "Sucesso",
        description: "Informações do paciente atualizadas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar as informações do paciente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PatientEditData) => {
    updatePatientMutation.mutate(data);
  };

  // Reset form when patient data changes
  useEffect(() => {
    if (patient) {
      form.reset({
        name: patient.name,
        cpf: patient.cpf,
        birthDate: patient.birthDate,
        phone: patient.phone,
        email: patient.email || "",
        address: patient.address || "",
        clinicalNotes: patient.clinicalNotes || "",
      });
    }
  }, [patient, form]);

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: "Agendado", className: "status-scheduled" },
      confirmed: { label: "Confirmado", className: "status-confirmed" },
      attended: { label: "Atendido", className: "status-attended" },
      cancelled: { label: "Cancelado", className: "status-cancelled" },
      paid: { label: "Pago", className: "financial-paid" },
      pending: { label: "Pendente", className: "financial-pending" },
      overdue: { label: "Vencido", className: "financial-overdue" },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap];
    return statusInfo ? (
      <Badge className={`status-badge ${statusInfo.className}`}>
        {statusInfo.label}
      </Badge>
    ) : null;
  };

  if (patientLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Paciente não encontrado</h2>
          <p className="text-neutral-600 mb-4">O paciente solicitado não foi encontrado.</p>
          <Link href="/patients">
            <Button>Voltar para lista de pacientes</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/patients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-lg font-medium shrink-0">
            {getInitials(patient.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 break-words">{patient.name}</h1>
            <p className="text-sm text-neutral-600 truncate">{patient.email || 'Email não informado'}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto">
            <CalendarPlus className="w-4 h-4 mr-2" />
            Agendar Consulta
          </Button>
          <Button className="w-full sm:w-auto">
            <FileText className="w-4 h-4 mr-2" />
            Nova Consulta
          </Button>
        </div>
      </div>



      {/* Tabs */}
      <Tabs defaultValue="informacoes" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-5 min-w-max">
            <TabsTrigger value="informacoes" className="text-xs sm:text-sm whitespace-nowrap">Informações</TabsTrigger>
            <TabsTrigger value="consultations" className="text-xs sm:text-sm whitespace-nowrap">Histórico</TabsTrigger>
            <TabsTrigger value="odontogram" className="text-xs sm:text-sm whitespace-nowrap">Odontograma</TabsTrigger>
            <TabsTrigger value="anamnese" className="text-xs sm:text-sm whitespace-nowrap">Anamnese</TabsTrigger>
            <TabsTrigger value="financial" className="text-xs sm:text-sm whitespace-nowrap">Financeiro</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="informacoes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl">Informações Pessoais</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                {isEditing ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        form.reset();
                      }}
                      className="flex-1 sm:flex-none"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm"
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={updatePatientMutation.isPending}
                      className="flex-1 sm:flex-none"
                    >
                      {updatePatientMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="w-full sm:w-auto"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome completo" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="cpf"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPF</FormLabel>
                              <FormControl>
                                <Input placeholder="000.000.000-00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="birthDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data de Nascimento</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <Input placeholder="(00) 00000-0000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@exemplo.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Endereço</FormLabel>
                              <FormControl>
                                <Input placeholder="Endereço completo" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="clinicalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações Clínicas</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Observações e anotações clínicas..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  <div className="space-y-4 lg:space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-neutral-600" />
                        <label className="text-sm font-medium text-neutral-600">Nome Completo</label>
                      </div>
                      <p className="text-base lg:text-lg font-medium text-neutral-900 break-words">{patient.name}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-neutral-600" />
                        <label className="text-sm font-medium text-neutral-600">CPF</label>
                      </div>
                      <p className="text-base lg:text-lg font-medium text-neutral-900 font-mono">{formatCPF(patient.cpf)}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-neutral-600" />
                        <label className="text-sm font-medium text-neutral-600">Data de Nascimento</label>
                      </div>
                      <p className="text-base lg:text-lg font-medium text-neutral-900">{formatDate(patient.birthDate)}</p>
                    </div>
                  </div>
                  <div className="space-y-4 lg:space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-neutral-600" />
                        <label className="text-sm font-medium text-neutral-600">Telefone</label>
                      </div>
                      <p className="text-base lg:text-lg font-medium text-neutral-900 font-mono">{formatPhone(patient.phone)}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-neutral-600" />
                        <label className="text-sm font-medium text-neutral-600">Email</label>
                      </div>
                      <p className="text-base lg:text-lg font-medium text-neutral-900 break-all">{patient.email || "Não informado"}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-neutral-600" />
                        <label className="text-sm font-medium text-neutral-600">Endereço</label>
                      </div>
                      <p className="text-base lg:text-lg font-medium text-neutral-900 break-words">{patient.address || "Não informado"}</p>
                    </div>
                  </div>
                </div>
              )}
              {!isEditing && patient.clinicalNotes && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center space-x-2 mb-2">
                    <ClipboardList className="w-4 h-4 text-neutral-600" />
                    <label className="text-sm font-medium text-neutral-600">Observações Clínicas</label>
                  </div>
                  <p className="text-base lg:text-lg text-neutral-900 leading-relaxed">{patient.clinicalNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Atendimentos</CardTitle>
            </CardHeader>
            <CardContent>
              {consultationsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : consultations && consultations.length > 0 ? (
                <div className="space-y-4">
                  {consultations.map((consultation) => (
                    <div key={consultation.id} className="p-6 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-3">
                        <div className="space-y-1">
                          <p className="font-medium text-lg">{consultation.procedures?.join(", ") || "Consulta"}</p>
                          <p className="text-sm text-neutral-600">
                            {formatDate(consultation.date)} - Dr. {consultation.dentist?.name}
                          </p>
                        </div>
                        <Badge className="status-attended self-start lg:self-center">
                          Atendido
                        </Badge>
                      </div>
                      {consultation.clinicalNotes && (
                        <p className="text-sm text-neutral-600 mb-2">{consultation.clinicalNotes}</p>
                      )}
                      {consultation.observations && (
                        <p className="text-sm text-neutral-500">{consultation.observations}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-neutral-600 py-8">
                  Nenhum atendimento registrado
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="odontogram" className="space-y-4 odontogram-container">
          <Odontogram patientId={patientId} />
        </TabsContent>

        <TabsContent value="anamnese" className="space-y-4">
          <div className="w-full max-w-none">
            <AnamneseForm patientId={patientId} />
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Situação Financeira</CardTitle>
            </CardHeader>
            <CardContent>
              {financialLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : financial && financial.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-neutral-50">
                      <tr className="border-b">
                        <th className="text-left py-4 px-4 font-medium text-neutral-700">Descrição</th>
                        <th className="text-left py-4 px-4 font-medium text-neutral-700">Valor</th>
                        <th className="text-left py-4 px-4 font-medium text-neutral-700">Vencimento</th>
                        <th className="text-left py-4 px-4 font-medium text-neutral-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financial.map((record) => (
                        <tr key={record.id} className="border-b hover:bg-neutral-50/50 transition-colors">
                          <td className="py-4 px-4">
                            <p className="font-medium text-neutral-900">{record.description}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-semibold text-lg text-neutral-900">
                              R$ {Number(record.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-neutral-900">{formatDate(record.dueDate)}</td>
                          <td className="py-4 px-4">{getStatusBadge(record.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-neutral-600 py-8">
                  Nenhum registro financeiro
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
