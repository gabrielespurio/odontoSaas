import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, User, Calendar } from "lucide-react";

const paymentSchema = z.object({
  paymentDate: z.string().min(1, "Data de pagamento é obrigatória"),
  paymentMethod: z.string().min(1, "Método de pagamento é obrigatório"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

type Receivable = {
  id: number;
  patientId: number;
  amount: string;
  dueDate: string;
  description?: string;
  paymentMethod?: string;
  patient: {
    name: string;
  };
};

interface PaymentFormProps {
  receivable: Receivable;
  onSuccess: (paymentData: PaymentFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "debit_card", label: "Cartão de Débito" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "pix", label: "PIX" },
  { value: "bank_transfer", label: "Transferência Bancária" },
  { value: "check", label: "Cheque" },
];

export default function PaymentForm({ receivable, onSuccess, onCancel, isLoading = false }: PaymentFormProps) {
  // Definir método de pagamento padrão baseado na conta a receber
  const getDefaultPaymentMethod = () => {
    if (receivable.paymentMethod) {
      return receivable.paymentMethod;
    }
    return "pix"; // Fallback para PIX
  };

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: getDefaultPaymentMethod(),
    },
  });

  const formatCurrency = (amount: string) => {
    return `R$ ${Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const onSubmit = (data: PaymentFormData) => {
    onSuccess(data);
  };

  return (
    <div className="space-y-6">
      {/* Informações da Conta */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">Detalhes da Conta a Receber</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Paciente:</span>
            <span className="font-medium">{receivable.patient.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Valor:</span>
            <span className="font-bold text-lg text-green-600">{formatCurrency(receivable.amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Vencimento:</span>
            <span className="font-medium">{formatDate(receivable.dueDate)}</span>
          </div>
          {receivable.description && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Descrição:</span>
              <span className="font-medium">{receivable.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Formulário de Pagamento */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="paymentDate" className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Data do Pagamento
          </Label>
          <Input
            id="paymentDate"
            type="date"
            {...form.register("paymentDate")}
            max={new Date().toISOString().split('T')[0]}
          />
          {form.formState.errors.paymentDate && (
            <p className="text-sm text-red-600">{form.formState.errors.paymentDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod" className="flex items-center">
            <CreditCard className="w-4 h-4 mr-2" />
            Método de Pagamento
          </Label>
          <Select
            value={form.watch("paymentMethod")}
            onValueChange={(value) => form.setValue("paymentMethod", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o método de pagamento" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.paymentMethod && (
            <p className="text-sm text-red-600">{form.formState.errors.paymentMethod.message}</p>
          )}
        </div>

        <div className="flex space-x-3 pt-4">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "Processando..." : "Confirmar Recebimento"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            className="flex-1"
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}