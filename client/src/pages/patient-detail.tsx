import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function PatientDetail() {
  const { id } = useParams();
  const patientId = parseInt(id || "0");
  
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
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/patients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-lg font-medium shrink-0">
              {getInitials(patient.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-neutral-900 break-words">{patient.name}</h1>
              <p className="text-neutral-600 truncate">{patient.email || 'Email não informado'}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 lg:shrink-0">
          <Button variant="outline" className="sm:w-auto">
            <CalendarPlus className="w-4 h-4 mr-2" />
            Agendar Consulta
          </Button>
          <Button className="sm:w-auto">
            <FileText className="w-4 h-4 mr-2" />
            Nova Consulta
          </Button>
        </div>
      </div>

      {/* Patient Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center">
              <User className="w-5 h-5 text-neutral-400 mr-2" />
              <div>
                <p className="text-sm text-neutral-600">CPF</p>
                <p className="font-medium">{formatCPF(patient.cpf)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-neutral-400 mr-2" />
              <div>
                <p className="text-sm text-neutral-600">Data de Nascimento</p>
                <p className="font-medium">{formatDate(patient.birthDate)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Phone className="w-5 h-5 text-neutral-400 mr-2" />
              <div>
                <p className="text-sm text-neutral-600">Telefone</p>
                <p className="font-medium">{formatPhone(patient.phone)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-neutral-400 mr-2" />
              <div>
                <p className="text-sm text-neutral-600">Email</p>
                <p className="font-medium">{patient.email || "Não informado"}</p>
              </div>
            </div>
          </div>
          {patient.address && (
            <div className="mt-4 flex items-center">
              <MapPin className="w-5 h-5 text-neutral-400 mr-2" />
              <div>
                <p className="text-sm text-neutral-600">Endereço</p>
                <p className="font-medium">{patient.address}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="informacoes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="informacoes">Informações Pessoais</TabsTrigger>
          <TabsTrigger value="consultations">Histórico</TabsTrigger>
          <TabsTrigger value="odontogram">Odontograma</TabsTrigger>
          <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="informacoes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informações Pessoais</CardTitle>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-neutral-600" />
                      <label className="text-sm font-medium text-neutral-600">Nome Completo</label>
                    </div>
                    <p className="text-lg font-medium text-neutral-900 break-words">{patient.name}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-neutral-600" />
                      <label className="text-sm font-medium text-neutral-600">CPF</label>
                    </div>
                    <p className="text-lg font-medium text-neutral-900 font-mono">{formatCPF(patient.cpf)}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-neutral-600" />
                      <label className="text-sm font-medium text-neutral-600">Data de Nascimento</label>
                    </div>
                    <p className="text-lg font-medium text-neutral-900">{formatDate(patient.birthDate)}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-neutral-600" />
                      <label className="text-sm font-medium text-neutral-600">Telefone</label>
                    </div>
                    <p className="text-lg font-medium text-neutral-900 font-mono">{formatPhone(patient.phone)}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-neutral-600" />
                      <label className="text-sm font-medium text-neutral-600">Email</label>
                    </div>
                    <p className="text-lg font-medium text-neutral-900 break-all">{patient.email || "Não informado"}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-neutral-600" />
                      <label className="text-sm font-medium text-neutral-600">Endereço</label>
                    </div>
                    <p className="text-lg font-medium text-neutral-900 break-words">{patient.address || "Não informado"}</p>
                  </div>
                </div>
              </div>
              {patient.clinicalNotes && (
                <div className="mt-6 pt-6 border-t">
                  <label className="text-sm font-medium text-neutral-600">Observações Clínicas</label>
                  <p className="text-lg mt-2">{patient.clinicalNotes}</p>
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

        <TabsContent value="odontogram">
          <Odontogram patientId={patientId} />
        </TabsContent>

        <TabsContent value="anamnese">
          <AnamneseForm patientId={patientId} />
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
