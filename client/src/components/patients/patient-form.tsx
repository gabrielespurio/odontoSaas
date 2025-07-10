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
import { Loader2 } from "lucide-react";
import type { Patient } from "@/lib/types";

const patientSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  cpf: z.string().min(11, "CPF é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  phone: z.string().min(10, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  // Structured address fields
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  // Keep for backwards compatibility
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
    if (patient) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
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
      
      // Remove formatação do CEP
      const cleanCEP = cep.replace(/\D/g, "");
      
      // Valida se tem 8 dígitos
      if (cleanCEP.length !== 8) return;
      
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      // Verifica se houve erro na consulta
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "O CEP informado não foi encontrado.",
          variant: "destructive",
        });
        return;
      }
      
      // Preenche os campos automaticamente
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
        description: "Não foi possível consultar o CEP. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingCEP(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            {...form.register("name")}
            placeholder="Digite o nome completo"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpf">CPF *</Label>
          <Input
            id="cpf"
            {...form.register("cpf")}
            placeholder="000.000.000-00"
            onChange={(e) => {
              const formatted = formatCPF(e.target.value);
              form.setValue("cpf", formatted);
            }}
          />
          {form.formState.errors.cpf && (
            <p className="text-sm text-red-600">{form.formState.errors.cpf.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthDate">Data de Nascimento *</Label>
          <Input
            id="birthDate"
            type="date"
            {...form.register("birthDate")}
          />
          {form.formState.errors.birthDate && (
            <p className="text-sm text-red-600">{form.formState.errors.birthDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone *</Label>
          <Input
            id="phone"
            {...form.register("phone")}
            placeholder="(11) 99999-9999"
            onChange={(e) => {
              const formatted = formatPhone(e.target.value);
              form.setValue("phone", formatted);
            }}
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register("email")}
            placeholder="email@exemplo.com"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>
      </div>

      {/* Structured Address Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Endereço</h3>
        
        <div className="grid grid-cols-12 gap-4">
          {/* CEP - takes 3 columns */}
          <div className="col-span-12 md:col-span-3 space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <div className="relative">
              <Input
                id="cep"
                {...form.register("cep")}
                placeholder="00000-000"
                maxLength={9}
                onChange={(e) => {
                  const formatted = formatCEP(e.target.value);
                  form.setValue("cep", formatted);
                  
                  // Busca automaticamente quando CEP está completo
                  if (formatted.length === 9) {
                    searchCEP(formatted);
                  }
                }}
              />
              {isSearchingCEP && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                </div>
              )}
            </div>
            {form.formState.errors.cep && (
              <p className="text-sm text-red-600">{form.formState.errors.cep.message}</p>
            )}
            {isSearchingCEP && (
              <p className="text-sm text-blue-600">Buscando endereço...</p>
            )}
          </div>

          {/* Logradouro - takes 9 columns */}
          <div className="col-span-12 md:col-span-9 space-y-2">
            <Label htmlFor="street">Logradouro</Label>
            <Input
              id="street"
              {...form.register("street")}
              placeholder="Rua, Avenida, etc."
            />
            {form.formState.errors.street && (
              <p className="text-sm text-red-600">{form.formState.errors.street.message}</p>
            )}
          </div>

          {/* Número - takes 2 columns (better size) */}
          <div className="col-span-4 md:col-span-2 space-y-2">
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              {...form.register("number")}
              placeholder="123"
            />
            {form.formState.errors.number && (
              <p className="text-sm text-red-600">{form.formState.errors.number.message}</p>
            )}
          </div>

          {/* Bairro - takes 4 columns */}
          <div className="col-span-4 md:col-span-4 space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              {...form.register("neighborhood")}
              placeholder="Nome do bairro"
            />
            {form.formState.errors.neighborhood && (
              <p className="text-sm text-red-600">{form.formState.errors.neighborhood.message}</p>
            )}
          </div>

          {/* Cidade - takes 4 columns */}
          <div className="col-span-4 md:col-span-4 space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              {...form.register("city")}
              placeholder="Nome da cidade"
            />
            {form.formState.errors.city && (
              <p className="text-sm text-red-600">{form.formState.errors.city.message}</p>
            )}
          </div>

          {/* Estado - takes 2 columns */}
          <div className="col-span-12 md:col-span-2 space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              {...form.register("state")}
              placeholder="SP"
              maxLength={2}
              className="uppercase"
              onChange={(e) => {
                const uppercased = e.target.value.toUpperCase();
                form.setValue("state", uppercased);
              }}
            />
            {form.formState.errors.state && (
              <p className="text-sm text-red-600">{form.formState.errors.state.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clinicalNotes">Observações Clínicas</Label>
        <Textarea
          id="clinicalNotes"
          {...form.register("clinicalNotes")}
          placeholder="Observações gerais sobre o paciente"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
