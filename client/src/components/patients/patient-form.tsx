import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, User, MapPin, FileText, AlertCircle, CheckCircle } from "lucide-react";
import type { Patient } from "@/lib/types";
import { useCompanyFilter } from "@/contexts/company-context";

const patientSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  cpf: z.string().min(11, "CPF é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  phone: z.string().min(10, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional(),
  clinicalNotes: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientFormProps {
  patient?: Patient | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PatientForm({ patient, onSuccess, onCancel }: PatientFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const { companyId } = useCompanyFilter();
  
  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
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

  const createMutation = useMutation({
    mutationFn: (data: PatientFormData) => apiRequest("POST", "/api/patients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/patients" 
      });
      toast({
        title: "Sucesso",
        description: "Paciente criado com sucesso",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar paciente",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PatientFormData) => apiRequest("PUT", `/api/patients/${patient?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/patients" 
      });
      toast({
        title: "Sucesso",
        description: "Paciente atualizado com sucesso",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar paciente",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PatientFormData) => {
    const cleanData = {
      ...data,
      cpf: data.cpf.replace(/\D/g, ""),
      phone: data.phone.replace(/\D/g, ""),
      cep: data.cep?.replace(/\D/g, "") || "",
      companyId: companyId || undefined,
    };

    if (patient) {
      updateMutation.mutate(cleanData);
    } else {
      createMutation.mutate(cleanData);
    }
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
      .slice(0, 14);
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3")
      .slice(0, 15);
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d{3})/, "$1-$2")
      .slice(0, 9);
  };

  const searchCEP = async (cep: string) => {
    try {
      setIsSearchingCEP(true);
      const cleanCEP = cep.replace(/\D/g, "");
      if (cleanCEP.length !== 8) return;
      
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "O CEP informado não foi encontrado.",
          variant: "destructive",
        });
        return;
      }
      
      form.setValue("street", data.logradouro || "");
      form.setValue("neighborhood", data.bairro || "");
      form.setValue("city", data.localidade || "");
      form.setValue("state", data.uf || "");
      
      toast({
        title: "Endereço encontrado",
        description: "Os campos foram preenchidos automaticamente.",
      });
    } catch (error) {
      toast({
        title: "Erro na consulta",
        description: "Não foi possível consultar o CEP.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingCEP(false);
    }
  };

  const FormField = ({ label, required = false, error, children }: any) => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-gray-900 dark:text-white">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-500 font-medium">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full bg-white dark:bg-gray-950 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {patient ? "Editar Paciente" : "Novo Paciente"}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {patient ? "Atualize os dados do paciente" : "Cadastre um novo paciente no sistema"}
          </p>
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-6 space-y-8">
        
        {/* Section 1: Informações Pessoais */}
        <div>
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-200 dark:border-gray-800">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Informações Pessoais</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField 
              label="Nome Completo" 
              required 
              error={form.formState.errors.name?.message}
            >
              <Input
                {...form.register("name")}
                placeholder="Digite o nome completo"
                className="h-10 px-4 border-gray-300 dark:border-gray-700 rounded-md"
                data-testid="input-patient-name"
              />
            </FormField>

            <FormField 
              label="CPF" 
              required 
              error={form.formState.errors.cpf?.message}
            >
              <Input
                {...form.register("cpf")}
                placeholder="000.000.000-00"
                onChange={(e) => form.setValue("cpf", formatCPF(e.target.value))}
                className="h-10 px-4 border-gray-300 dark:border-gray-700 rounded-md"
                data-testid="input-patient-cpf"
              />
            </FormField>

            <FormField 
              label="Data de Nascimento" 
              required 
              error={form.formState.errors.birthDate?.message}
            >
              <Input
                type="date"
                {...form.register("birthDate")}
                className="h-10 px-4 border-gray-300 dark:border-gray-700 rounded-md"
                data-testid="input-patient-birthdate"
              />
            </FormField>

            <FormField 
              label="Telefone" 
              required 
              error={form.formState.errors.phone?.message}
            >
              <Input
                {...form.register("phone")}
                placeholder="(11) 99999-9999"
                onChange={(e) => form.setValue("phone", formatPhone(e.target.value))}
                className="h-10 px-4 border-gray-300 dark:border-gray-700 rounded-md"
                data-testid="input-patient-phone"
              />
            </FormField>

            <FormField 
              label="Email" 
              error={form.formState.errors.email?.message}
            >
              <Input
                type="email"
                {...form.register("email")}
                placeholder="email@exemplo.com"
                className="h-10 px-4 border-gray-300 dark:border-gray-700 rounded-md"
                data-testid="input-patient-email"
              />
            </FormField>
          </div>
        </div>

        {/* Section 2: Endereço */}
        <div>
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-200 dark:border-gray-800">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Endereço</h3>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* CEP */}
            <div className="col-span-12 sm:col-span-3">
              <FormField 
                label="CEP" 
                error={form.formState.errors.cep?.message}
              >
                <div className="relative">
                  <Input
                    {...form.register("cep")}
                    placeholder="00000-000"
                    maxLength={9}
                    onChange={(e) => {
                      const formatted = formatCEP(e.target.value);
                      form.setValue("cep", formatted);
                      if (formatted.length === 9) searchCEP(formatted);
                    }}
                    className="h-10 px-4 border-gray-300 dark:border-gray-700 rounded-md"
                    data-testid="input-patient-cep"
                  />
                  {isSearchingCEP && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />
                  )}
                </div>
              </FormField>
            </div>

            {/* Logradouro */}
            <div className="col-span-12 sm:col-span-9">
              <FormField 
                label="Logradouro" 
                error={form.formState.errors.street?.message}
              >
                <Input
                  {...form.register("street")}
                  placeholder="Rua, Avenida, etc."
                  className="h-10 px-4 border-gray-300 dark:border-gray-700 rounded-md"
                  data-testid="input-patient-street"
                />
              </FormField>
            </div>

            {/* Número */}
            <div className="col-span-6 sm:col-span-2">
              <FormField 
                label="Número" 
                error={form.formState.errors.number?.message}
              >
                <Input
                  {...form.register("number")}
                  placeholder="123"
                  className="h-10 px-4 border-gray-300 dark:border-gray-700 rounded-md"
                  data-testid="input-patient-number"
                />
              </FormField>
            </div>

            {/* Bairro */}
            <div className="col-span-6 sm:col-span-4">
              <FormField 
                label="Bairro" 
                error={form.formState.errors.neighborhood?.message}
              >
                <Input
                  {...form.register("neighborhood")}
                  placeholder="Nome do bairro"
                  className="h-10 px-4 border-gray-300 dark:border-gray-700 rounded-md"
                  data-testid="input-patient-neighborhood"
                />
              </FormField>
            </div>

            {/* Cidade */}
            <div className="col-span-8 sm:col-span-4">
              <FormField 
                label="Cidade" 
                error={form.formState.errors.city?.message}
              >
                <Input
                  {...form.register("city")}
                  placeholder="Nome da cidade"
                  className="h-10 px-4 border-gray-300 dark:border-gray-700 rounded-md"
                  data-testid="input-patient-city"
                />
              </FormField>
            </div>

            {/* Estado */}
            <div className="col-span-4 sm:col-span-2">
              <FormField 
                label="Estado" 
                error={form.formState.errors.state?.message}
              >
                <Input
                  {...form.register("state")}
                  placeholder="SP"
                  maxLength={2}
                  className="h-10 px-4 border-gray-300 dark:border-gray-700 rounded-md uppercase"
                  onChange={(e) => form.setValue("state", e.target.value.toUpperCase())}
                  data-testid="input-patient-state"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 3: Observações Clínicas */}
        <div>
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-200 dark:border-gray-800">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Observações Clínicas</h3>
          </div>

          <FormField 
            label="Observações" 
            error={form.formState.errors.clinicalNotes?.message}
          >
            <Textarea
              {...form.register("clinicalNotes")}
              placeholder="Observações gerais sobre o paciente"
              rows={4}
              className="px-4 py-3 border-gray-300 dark:border-gray-700 rounded-md resize-none"
              data-testid="textarea-patient-notes"
            />
          </FormField>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="px-6 h-10"
            data-testid="button-patient-cancel"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-6 h-10 bg-primary hover:bg-primary/90 text-white"
            data-testid="button-patient-save"
          >
            {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
