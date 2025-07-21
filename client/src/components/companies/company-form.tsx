import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea"; // Not used in this component
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCompanySchema, type Company } from "@shared/schema";

const formSchema = insertCompanySchema.extend({
  maxUsers: z.number().min(1, "Deve ter pelo menos 1 usuário"),
  maxPatients: z.number().min(1, "Deve ter pelo menos 1 paciente"),
});

type FormData = z.infer<typeof formSchema>;

interface CompanyFormProps {
  company?: Company | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CompanyForm({ company, onSuccess, onCancel }: CompanyFormProps) {
  const { toast } = useToast();
  const isEditing = !!company;

  // Formatting functions
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .substring(0, 14);
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 15);
    }
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 9);
  };

  // ViaCEP API integration
  const handleCEPChange = async (cep: string) => {
    const formattedCEP = formatCEP(cep);
    setValue("cep", formattedCEP);
    
    // Remove formatting for API call
    const numbersOnly = cep.replace(/\D/g, '');
    
    if (numbersOnly.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${numbersOnly}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setValue("street", data.logradouro || "");
          setValue("neighborhood", data.bairro || "");
          setValue("city", data.localidade || "");
          setValue("state", data.uf || "");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: company?.name || "",
      tradeName: company?.tradeName || "",
      cnpj: company?.cnpj || "",
      email: company?.email || "",
      phone: company?.phone || "",
      responsibleName: company?.responsibleName || "",
      responsiblePhone: company?.responsiblePhone || "",
      cep: company?.cep || "",
      street: company?.street || "",
      number: company?.number || "",
      neighborhood: company?.neighborhood || "",
      city: company?.city || "",
      state: company?.state || "",
      planType: company?.planType || "basic",
      maxUsers: company?.maxUsers || 5,
      maxPatients: company?.maxPatients || 500,
      isActive: company?.isActive ?? true,
      trialEndDate: company?.trialEndDate || "",
      subscriptionStartDate: company?.subscriptionStartDate || "",
      subscriptionEndDate: company?.subscriptionEndDate || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const url = isEditing ? `/api/companies/${company.id}` : '/api/companies';
      const method = isEditing ? 'PUT' : 'POST';
      
      return apiRequest(url, {
        method,
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Empresa atualizada" : "Empresa criada",
        description: `A empresa foi ${isEditing ? 'atualizada' : 'criada'} com sucesso.`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: `Erro ao ${isEditing ? 'atualizar' : 'criar'} empresa`,
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const planType = watch("planType");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome da Empresa *</Label>
              <Input
                id="name"
                {...register("name")}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="tradeName">Nome Fantasia</Label>
              <Input
                id="tradeName"
                {...register("tradeName")}
                className={errors.tradeName ? "border-red-500" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                {...register("cnpj")}
                placeholder="00.000.000/0000-00"
                className={errors.cnpj ? "border-red-500" : ""}
                onChange={(e) => {
                  const formatted = formatCNPJ(e.target.value);
                  setValue("cnpj", formatted);
                }}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="(11) 99999-9999"
                className={errors.phone ? "border-red-500" : ""}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setValue("phone", formatted);
                }}
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="responsibleName">Nome do Responsável *</Label>
              <Input
                id="responsibleName"
                {...register("responsibleName")}
                className={errors.responsibleName ? "border-red-500" : ""}
              />
              {errors.responsibleName && (
                <p className="text-sm text-red-500 mt-1">{errors.responsibleName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="responsiblePhone">Telefone do Responsável *</Label>
              <Input
                id="responsiblePhone"
                {...register("responsiblePhone")}
                placeholder="(11) 99999-9999"
                className={errors.responsiblePhone ? "border-red-500" : ""}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setValue("responsiblePhone", formatted);
                }}
              />
              {errors.responsiblePhone && (
                <p className="text-sm text-red-500 mt-1">{errors.responsiblePhone.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                {...register("cep")}
                placeholder="00000-000"
                onChange={(e) => handleCEPChange(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                {...register("state")}
                placeholder="SP"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              {...register("city")}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <Label htmlFor="street">Rua</Label>
              <Input
                id="street"
                {...register("street")}
              />
            </div>
            <div>
              <Label htmlFor="number">Número</Label>
              <Input
                id="number"
                {...register("number")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              {...register("neighborhood")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações da Licença</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-6 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="trialEndDate" className="text-sm font-medium text-gray-700">
                Fim do Trial
              </Label>
              <Input
                id="trialEndDate"
                type="date"
                {...register("trialEndDate")}
                className="h-12 w-full text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptionStartDate" className="text-sm font-medium text-gray-700">
                Início da Assinatura
              </Label>
              <Input
                id="subscriptionStartDate"
                type="date"
                {...register("subscriptionStartDate")}
                className="h-12 w-full text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptionEndDate" className="text-sm font-medium text-gray-700">
                Fim da Assinatura
              </Label>
              <Input
                id="subscriptionEndDate"
                type="date"
                {...register("subscriptionEndDate")}
                className="h-12 w-full text-base"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <Switch
              id="isActive"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
            <Label htmlFor="isActive" className="text-sm font-medium">
              Empresa ativa
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}