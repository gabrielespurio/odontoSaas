import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, CreditCard, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Consultation, Procedure } from "@/lib/types";

interface GenerateReceivableModalProps {
  consultation: Consultation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GenerateReceivableModal({
  consultation,
  open,
  onOpenChange,
}: GenerateReceivableModalProps) {
  const [selectedProcedures, setSelectedProcedures] = useState<number[]>([]);
  const [installments, setInstallments] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar procedimentos disponíveis
  const { data: procedures = [] } = useQuery<Procedure[]>({
    queryKey: ["/api/procedures"],
    enabled: open,
  });

  // Resetar estado quando modal abre/fecha
  useEffect(() => {
    if (open && consultation) {
      // Pre-selecionar procedimentos da consulta se existirem
      const consultationProcedureIds = consultation.procedures || [];
      setSelectedProcedures(consultationProcedureIds);
      setInstallments(1);
      setCustomAmount("");
      setUseCustomAmount(false);
    } else {
      setSelectedProcedures([]);
      setInstallments(1);
      setCustomAmount("");
      setUseCustomAmount(false);
    }
  }, [open, consultation]);

  // Calcular valor total baseado nos procedimentos selecionados
  const calculateTotalAmount = () => {
    if (useCustomAmount && customAmount) {
      return parseFloat(customAmount) || 0;
    }

    return selectedProcedures.reduce((total, procedureId) => {
      const procedure = procedures.find(p => p.id === procedureId);
      return total + (procedure ? parseFloat(procedure.price) : 0);
    }, 0);
  };

  const totalAmount = calculateTotalAmount();
  const installmentAmount = totalAmount / installments;

  // Mutation para gerar conta a receber
  const generateReceivableMutation = useMutation({
    mutationFn: async () => {
      if (!consultation) throw new Error("Consulta não encontrada");

      const payload = {
        consultationId: consultation.id,
        procedureIds: selectedProcedures,
        installments: installments,
        customAmount: useCustomAmount ? customAmount : undefined,
      };

      return apiRequest("/api/receivables/from-consultation", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast({
        title: "Cobrança gerada com sucesso!",
        description: `${installments === 1 ? "1 conta a receber criada" : `${installments} parcelas criadas`}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/receivables"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar cobrança",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!useCustomAmount && selectedProcedures.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Selecione pelo menos um procedimento ou defina um valor personalizado",
        variant: "destructive",
      });
      return;
    }

    if (useCustomAmount && (!customAmount || parseFloat(customAmount) <= 0)) {
      toast({
        title: "Erro de validação",
        description: "Digite um valor válido maior que zero",
        variant: "destructive",
      });
      return;
    }

    generateReceivableMutation.mutate();
  };

  const handleProcedureToggle = (procedureId: number) => {
    setSelectedProcedures(prev => 
      prev.includes(procedureId)
        ? prev.filter(id => id !== procedureId)
        : [...prev, procedureId]
    );
  };

  if (!consultation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Gerar Cobrança
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Consulta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Informações da Consulta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-600">Paciente:</span>
                  <p className="font-medium">{consultation.patient?.name}</p>
                </div>
                <div>
                  <span className="text-neutral-600">Data:</span>
                  <p className="font-medium">
                    {new Date(consultation.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-600">Dentista:</span>
                  <p className="font-medium">{consultation.dentist?.name}</p>
                </div>
                <div>
                  <span className="text-neutral-600">Status:</span>
                  <Badge variant="secondary" className="bg-green-500 text-white">
                    Concluído
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Procedimentos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Procedimentos Realizados</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="custom-amount"
                  checked={useCustomAmount}
                  onCheckedChange={setUseCustomAmount}
                />
                <Label htmlFor="custom-amount" className="text-sm">
                  Usar valor personalizado
                </Label>
              </div>
            </div>

            {useCustomAmount ? (
              <div className="space-y-2">
                <Label htmlFor="custom-amount-input">Valor Total (R$)</Label>
                <Input
                  id="custom-amount-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {procedures.map((procedure) => (
                  <div
                    key={procedure.id}
                    className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedProcedures.includes(procedure.id)}
                        onCheckedChange={() => handleProcedureToggle(procedure.id)}
                      />
                      <div>
                        <p className="font-medium text-sm">{procedure.name}</p>
                        <p className="text-xs text-neutral-600">{procedure.category}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      R$ {parseFloat(procedure.price).toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Parcelamento */}
          <div className="space-y-2">
            <Label htmlFor="installments">Parcelamento</Label>
            <Select value={installments.toString()} onValueChange={(value) => setInstallments(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num === 1 ? "À vista" : `${num}x de R$ ${(totalAmount / num).toFixed(2)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resumo */}
          {totalAmount > 0 && (
            <Card className="bg-neutral-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Resumo da Cobrança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Valor Total:</span>
                  <span className="font-semibold text-lg">R$ {totalAmount.toFixed(2)}</span>
                </div>
                
                {installments > 1 && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Parcelas:</span>
                      <span className="font-medium">
                        {installments}x de R$ {installmentAmount.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                <Separator />
                
                <div className="flex justify-between items-center text-sm text-neutral-600">
                  <span>Primeira parcela vence em:</span>
                  <span>{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={generateReceivableMutation.isPending || totalAmount <= 0}
              className="bg-primary hover:bg-primary/90"
            >
              {generateReceivableMutation.isPending ? (
                "Gerando..."
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Gerar Cobrança
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}