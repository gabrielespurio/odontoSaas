import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const receivableSchema = z.object({
  patientId: z.number().min(1, "Selecione um paciente"),
  amount: z.string().min(1, "Valor é obrigatório"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  description: z.string().optional(),
  installments: z.number().min(1).max(12).default(1),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

type ReceivableFormData = z.infer<typeof receivableSchema>;

type Patient = {
  id: number;
  name: string;
  email?: string;
  phone: string;
};

type Receivable = {
  id: number;
  patientId: number;
  amount: string;
  dueDate: string;
  description?: string;
  installments: number;
  paymentMethod?: string;
  notes?: string;
  patient: Patient;
};

interface ReceivableFormProps {
  receivable?: Receivable | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ReceivableForm({ receivable, onSuccess, onCancel }: ReceivableFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const form = useForm<ReceivableFormData>({
    resolver: zodResolver(receivableSchema),
    defaultValues: {
      patientId: receivable?.patientId || 0,
      amount: receivable?.amount || "",
      dueDate: receivable?.dueDate || "",
      description: receivable?.description || "",
      installments: receivable?.installments || 1,
      paymentMethod: receivable?.paymentMethod || "",
      notes: receivable?.notes || "",
    },
  });

  useEffect(() => {
    if (receivable) {
      form.reset({
        patientId: receivable.patientId,
        amount: receivable.amount,
        dueDate: receivable.dueDate,
        description: receivable.description || "",
        installments: receivable.installments,
        paymentMethod: receivable.paymentMethod || "",
        notes: receivable.notes || "",
      });
    } else {
      form.reset({
        patientId: 0,
        amount: "",
        dueDate: "",
        description: "",
        installments: 1,
        paymentMethod: "",
        notes: "",
      });
    }
  }, [receivable, form]);

  const onSubmit = async (data: ReceivableFormData) => {
    setIsLoading(true);
    try {
      const endpoint = receivable ? `/api/receivables/${receivable.id}` : "/api/receivables";
      const method = receivable ? "PUT" : "POST";

      // Se for mais de 1 parcela e é uma nova conta a receber, criar múltiplas
      if (!receivable && data.installments > 1) {
        const receivablesData = [];
        const installmentAmount = Number(data.amount) / data.installments;
        
        for (let i = 1; i <= data.installments; i++) {
          const dueDate = new Date(data.dueDate);
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
          
          receivablesData.push({
            patientId: data.patientId,
            amount: installmentAmount.toFixed(2),
            dueDate: dueDate.toISOString().split('T')[0],
            description: `${data.description} - Parcela ${i}/${data.installments}`,
            installments: data.installments,
            installmentNumber: i,
            paymentMethod: data.paymentMethod || undefined,
            notes: data.notes || undefined,
            status: "pending",
          });
        }

        // Criar primeira parcela
        const firstReceivable = await apiRequest("POST", "/api/receivables", receivablesData[0]);
        
        // Criar demais parcelas com referência à primeira
        for (let i = 1; i < receivablesData.length; i++) {
          await apiRequest("POST", "/api/receivables", {
            ...receivablesData[i],
            parentReceivableId: firstReceivable.id,
          });
        }
      } else {
        // Criar/atualizar conta única
        await apiRequest(method, endpoint, {
          patientId: data.patientId,
          amount: data.amount,
          dueDate: data.dueDate,
          description: data.description || undefined,
          installments: data.installments,
          installmentNumber: receivable?.installmentNumber || 1,
          paymentMethod: data.paymentMethod || undefined,
          notes: data.notes || undefined,
          status: receivable?.status || "pending",
        });
      }

      toast({
        title: "Sucesso",
        description: receivable ? "Conta a receber atualizada" : "Conta a receber criada",
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar conta a receber",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="patientId">Paciente</Label>
        <Select
          value={form.watch("patientId")?.toString() || ""}
          onValueChange={(value) => form.setValue("patientId", parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um paciente" />
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Valor Total</Label>
          <Input
            {...form.register("amount")}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
          />
          {form.formState.errors.amount && (
            <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="installments">Parcelas</Label>
          <Select
            value={form.watch("installments")?.toString() || "1"}
            onValueChange={(value) => form.setValue("installments", parseInt(value))}
            disabled={!!receivable} // Não permitir alterar parcelas em edição
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dueDate">Data de Vencimento</Label>
        <Input
          {...form.register("dueDate")}
          type="date"
        />
        {form.formState.errors.dueDate && (
          <p className="text-sm text-red-600">{form.formState.errors.dueDate.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          {...form.register("description")}
          placeholder="Descrição da conta a receber"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentMethod">Método de Pagamento Preferido</Label>
        <Select
          value={form.watch("paymentMethod") || ""}
          onValueChange={(value) => form.setValue("paymentMethod", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Dinheiro</SelectItem>
            <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
            <SelectItem value="debit_card">Cartão de Débito</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
            <SelectItem value="check">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          {...form.register("notes")}
          placeholder="Observações adicionais..."
          rows={3}
        />
      </div>

      {form.watch("installments") > 1 && !receivable && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Parcelamento:</strong> Serão criadas {form.watch("installments")} parcelas de{" "}
            R$ {(Number(form.watch("amount") || 0) / form.watch("installments")).toFixed(2)} cada,
            com vencimentos mensais a partir da data informada.
          </p>
        </div>
      )}

      <div className="flex space-x-3 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Salvando..." : receivable ? "Atualizar" : "Criar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  );
}