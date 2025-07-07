import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Financial, Patient, Consultation, Appointment } from "@/lib/types";

const paymentSchema = z.object({
  patientId: z.number().min(1, "Paciente é obrigatório"),
  consultationId: z.number().optional(),
  appointmentId: z.number().optional(),
  amount: z.string().min(1, "Valor é obrigatório"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue"]).default("pending"),
  description: z.string().min(1, "Descrição é obrigatória"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  payment?: Financial | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const PAYMENT_METHODS = [
  "Dinheiro",
  "Cartão de Débito",
  "Cartão de Crédito",
  "PIX",
  "Transferência Bancária",
  "Boleto",
  "Plano de Saúde",
];

export default function PaymentForm({ payment, onSuccess, onCancel }: PaymentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: consultations } = useQuery<Consultation[]>({
    queryKey: ["/api/consultations"],
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      patientId: payment?.patientId || 0,
      consultationId: payment?.consultationId || undefined,
      appointmentId: payment?.appointmentId || undefined,
      amount: payment?.amount || "",
      dueDate: payment?.dueDate || new Date().toISOString().split('T')[0],
      paymentDate: payment?.paymentDate || "",
      paymentMethod: payment?.paymentMethod || "",
      status: payment?.status || "pending",
      description: payment?.description || "",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) => apiRequest("POST", "/api/financial", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Sucesso",
        description: "Pagamento criado com sucesso",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar pagamento",
        variant: "destructive",
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) => apiRequest("PUT", `/api/financial/${payment?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Sucesso",
        description: "Pagamento atualizado com sucesso",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar pagamento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    // Clean up empty optional fields
    const cleanData = {
      ...data,
      consultationId: data.consultationId || undefined,
      appointmentId: data.appointmentId || undefined,
      paymentDate: data.paymentDate || undefined,
      paymentMethod: data.paymentMethod || undefined,
    };

    if (payment) {
      updatePaymentMutation.mutate(cleanData);
    } else {
      createPaymentMutation.mutate(cleanData);
    }
  };

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.,]/g, '');
    // Format as currency
    const formatted = numericValue.replace(/\D/g, '');
    if (formatted.length > 2) {
      const cents = formatted.slice(-2);
      const reais = formatted.slice(0, -2);
      return `${reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents}`;
    }
    return formatted;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    form.setValue("amount", formatted);
  };

  const getFilteredConsultations = () => {
    const patientId = form.watch("patientId");
    if (!patientId) return [];
    return consultations?.filter(consultation => consultation.patientId === patientId) || [];
  };

  const getFilteredAppointments = () => {
    const patientId = form.watch("patientId");
    if (!patientId) return [];
    return appointments?.filter(appointment => appointment.patientId === patientId) || [];
  };

  const getStatusOptions = () => {
    const options = [
      { value: "pending", label: "Pendente" },
      { value: "paid", label: "Pago" },
      { value: "overdue", label: "Vencido" },
    ];

    return options;
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="patientId">Paciente *</Label>
          <Select 
            value={form.watch("patientId")?.toString() || ""} 
            onValueChange={(value) => {
              form.setValue("patientId", parseInt(value));
              // Reset consultation and appointment when patient changes
              form.setValue("consultationId", undefined);
              form.setValue("appointmentId", undefined);
            }}
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
          <Label htmlFor="amount">Valor (R$) *</Label>
          <Input
            id="amount"
            value={form.watch("amount")}
            onChange={handleAmountChange}
            placeholder="0,00"
          />
          {form.formState.errors.amount && (
            <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Data de Vencimento *</Label>
          <Input
            id="dueDate"
            type="date"
            {...form.register("dueDate")}
          />
          {form.formState.errors.dueDate && (
            <p className="text-sm text-red-600">{form.formState.errors.dueDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select 
            value={form.watch("status")} 
            onValueChange={(value) => {
              form.setValue("status", value as any);
              // If marking as paid, set payment date to today
              if (value === "paid" && !form.watch("paymentDate")) {
                form.setValue("paymentDate", new Date().toISOString().split('T')[0]);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getStatusOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {form.watch("status") === "paid" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data de Pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                {...form.register("paymentDate")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select 
                value={form.watch("paymentMethod") || ""} 
                onValueChange={(value) => form.setValue("paymentMethod", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {form.watch("patientId") && (
          <>
            <div className="space-y-2">
              <Label htmlFor="consultationId">Consulta (Opcional)</Label>
              <Select 
                value={form.watch("consultationId")?.toString() || ""} 
                onValueChange={(value) => form.setValue("consultationId", value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a uma consulta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma consulta</SelectItem>
                  {getFilteredConsultations().map((consultation) => (
                    <SelectItem key={consultation.id} value={consultation.id.toString()}>
                      {new Date(consultation.date).toLocaleDateString('pt-BR')} - {consultation.procedures?.join(", ") || "Consulta"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointmentId">Agendamento (Opcional)</Label>
              <Select 
                value={form.watch("appointmentId")?.toString() || ""} 
                onValueChange={(value) => form.setValue("appointmentId", value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a um agendamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum agendamento</SelectItem>
                  {getFilteredAppointments().map((appointment) => (
                    <SelectItem key={appointment.id} value={appointment.id.toString()}>
                      {new Date(appointment.scheduledDate).toLocaleDateString('pt-BR')} - {appointment.procedure?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Descrição do pagamento (ex: Limpeza + Restauração, Consulta de rotina, etc.)"
          rows={3}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
        )}
      </div>

      {/* Payment Summary */}
      {form.watch("patientId") && form.watch("amount") && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Resumo do Pagamento</h4>
          {(() => {
            const selectedPatient = patients?.find(p => p.id === form.watch("patientId"));
            const amount = form.watch("amount");
            const dueDate = form.watch("dueDate");
            const status = form.watch("status");
            
            return (
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Paciente:</strong> {selectedPatient?.name || "Não selecionado"}</p>
                <p><strong>Valor:</strong> R$ {amount}</p>
                <p><strong>Vencimento:</strong> {dueDate ? new Date(dueDate).toLocaleDateString('pt-BR') : "Não definido"}</p>
                <p><strong>Status:</strong> {
                  status === "pending" ? "Pendente" :
                  status === "paid" ? "Pago" :
                  status === "overdue" ? "Vencido" : status
                }</p>
                {form.watch("paymentDate") && (
                  <p><strong>Data de Pagamento:</strong> {new Date(form.watch("paymentDate")).toLocaleDateString('pt-BR')}</p>
                )}
                {form.watch("paymentMethod") && (
                  <p><strong>Forma de Pagamento:</strong> {form.watch("paymentMethod")}</p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}
        >
          {createPaymentMutation.isPending || updatePaymentMutation.isPending 
            ? "Salvando..." 
            : payment ? "Atualizar" : "Salvar"
          }
        </Button>
      </div>
    </form>
  );
}
