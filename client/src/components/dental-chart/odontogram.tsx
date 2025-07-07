import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Activity, Save, X, History } from "lucide-react";
import type { DentalChart } from "@/lib/types";

const FDI_UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const FDI_UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
const FDI_LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];
const FDI_LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];

const TOOTH_CONDITIONS = [
  { value: "healthy", label: "Sadio", color: "fill-green-100 stroke-green-400", bgColor: "bg-green-100", borderColor: "border-green-400" },
  { value: "carie", label: "Cárie", color: "fill-red-200 stroke-red-500", bgColor: "bg-red-200", borderColor: "border-red-500" },
  { value: "restoration", label: "Restauração", color: "fill-amber-200 stroke-amber-500", bgColor: "bg-amber-200", borderColor: "border-amber-500" },
  { value: "extraction", label: "Extração", color: "fill-gray-300 stroke-gray-600", bgColor: "bg-gray-300", borderColor: "border-gray-600" },
  { value: "planned_treatment", label: "Tratamento Planejado", color: "fill-blue-200 stroke-blue-500", bgColor: "bg-blue-200", borderColor: "border-blue-500" },
  { value: "completed_treatment", label: "Tratamento Realizado", color: "fill-teal-200 stroke-teal-500", bgColor: "bg-teal-200", borderColor: "border-teal-500" },
];

interface OdontogramProps {
  patientId: number;
}

export default function Odontogram({ patientId }: OdontogramProps) {
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string>("healthy");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dentalChart, isLoading } = useQuery<DentalChart[]>({
    queryKey: [`/api/dental-chart/${patientId}`],
  });

  const updateToothMutation = useMutation({
    mutationFn: (data: { toothNumber: string; condition: string; notes?: string }) =>
      apiRequest("PUT", `/api/dental-chart/${patientId}/${data.toothNumber}`, {
        condition: data.condition,
        notes: data.notes,
        treatmentDate: new Date().toISOString().split('T')[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dental-chart/${patientId}`] });
      toast({
        title: "Sucesso",
        description: "Condição do dente atualizada com sucesso",
      });
      setSelectedTooth(null);
      setNotes("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar condição do dente",
        variant: "destructive",
      });
    },
  });

  const getToothCondition = (toothNumber: string) => {
    const tooth = dentalChart?.find(t => t.toothNumber === toothNumber);
    return tooth?.condition || "healthy";
  };

  const getToothColor = (toothNumber: string) => {
    const condition = getToothCondition(toothNumber);
    const conditionInfo = TOOTH_CONDITIONS.find(c => c.value === condition);
    return conditionInfo?.color || "fill-gray-200 stroke-gray-400";
  };

  const handleToothClick = (toothNumber: string) => {
    setSelectedTooth(toothNumber);
    const tooth = dentalChart?.find(t => t.toothNumber === toothNumber);
    setSelectedCondition(tooth?.condition || "healthy");
    setNotes(tooth?.notes || "");
  };

  const handleUpdateTooth = () => {
    if (selectedTooth) {
      updateToothMutation.mutate({
        toothNumber: selectedTooth,
        condition: selectedCondition,
        notes: notes,
      });
    }
  };

  const renderTooth = (toothNumber: string, x: number, y: number) => {
    const isSelected = selectedTooth === toothNumber;
    const colorClass = getToothColor(toothNumber);
    
    return (
      <g key={toothNumber} onClick={() => handleToothClick(toothNumber)} className="cursor-pointer">
        <defs>
          <filter id={`glow-${toothNumber}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/> 
            </feMerge>
          </filter>
        </defs>
        <rect
          x={x}
          y={y}
          width="35"
          height="45"
          rx="8"
          className={`${colorClass} ${
            isSelected 
              ? 'stroke-primary stroke-3 drop-shadow-lg' 
              : 'stroke-2 hover:stroke-primary hover:stroke-3'
          } transition-all duration-200 hover:drop-shadow-md`}
          style={{
            filter: isSelected ? `url(#glow-${toothNumber})` : 'none'
          }}
        />
        <text
          x={x + 17.5}
          y={y + 28}
          textAnchor="middle"
          className={`text-sm font-semibold ${
            isSelected ? 'fill-primary' : 'fill-neutral-700'
          } pointer-events-none transition-colors duration-200`}
        >
          {toothNumber}
        </text>
        {isSelected && (
          <circle
            cx={x + 30}
            cy={y + 5}
            r="3"
            className="fill-primary animate-pulse"
          />
        )}
      </g>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Main Dental Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Mapa Dentário Interativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Upper Jaw */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4 text-center">Arcada Superior</h3>
            <div className="flex justify-center dental-chart-container">
              <svg 
                width="100%" 
                height="140" 
                viewBox="0 0 700 140" 
                className="dental-chart-svg max-w-4xl border border-neutral-200 rounded-xl bg-gradient-to-b from-white to-neutral-50 shadow-inner"
              >
                {/* Upper right teeth */}
                {FDI_UPPER_RIGHT.map((tooth, index) => renderTooth(tooth, 30 + index * 45, 25))}
                {/* Upper left teeth */}
                {FDI_UPPER_LEFT.map((tooth, index) => renderTooth(tooth, 390 + index * 45, 25))}
                
                {/* Central divider line */}
                <line x1="365" y1="20" x2="365" y2="120" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="5,5" />
              </svg>
            </div>
          </div>

          {/* Lower Jaw */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4 text-center">Arcada Inferior</h3>
            <div className="flex justify-center dental-chart-container">
              <svg 
                width="100%" 
                height="140" 
                viewBox="0 0 700 140" 
                className="dental-chart-svg max-w-4xl border border-neutral-200 rounded-xl bg-gradient-to-t from-white to-neutral-50 shadow-inner"
              >
                {/* Lower right teeth */}
                {FDI_LOWER_RIGHT.map((tooth, index) => renderTooth(tooth, 30 + index * 45, 70))}
                {/* Lower left teeth */}
                {FDI_LOWER_LEFT.map((tooth, index) => renderTooth(tooth, 390 + index * 45, 70))}
                
                {/* Central divider line */}
                <line x1="365" y1="20" x2="365" y2="120" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="5,5" />
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-neutral-50 rounded-lg p-6">
            <h4 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Legenda das Condições
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {TOOTH_CONDITIONS.map((condition) => (
                <div key={condition.value} className="dental-legend-item flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 ${condition.bgColor} ${condition.borderColor}`}></div>
                  <span className="text-sm font-medium text-neutral-700">{condition.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tooth Editor - Below the chart */}
      {selectedTooth && (
        <Card className="tooth-editor-card shadow-sm border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  {selectedTooth}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Editando Dente {selectedTooth}</h3>
                  <p className="text-sm text-neutral-600">Defina a condição e adicione observações</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTooth(null)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Condition Selector */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="condition" className="text-sm font-semibold">Condição do Dente</Label>
                  <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione a condição" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOOTH_CONDITIONS.map((condition) => (
                        <SelectItem key={condition.value} value={condition.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded border ${condition.bgColor} ${condition.borderColor}`}></div>
                            {condition.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleUpdateTooth}
                    disabled={updateToothMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateToothMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTooth(null)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes" className="text-sm font-semibold">Observações Clínicas</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2 min-h-[100px]"
                    placeholder="Descreva detalhes sobre o tratamento, observações clínicas, procedimentos realizados..."
                  />
                </div>

                {/* Tooth History */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico do Dente
                  </Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                    {dentalChart
                      ?.filter(tooth => tooth.toothNumber === selectedTooth)
                      .map((tooth) => (
                        <div key={tooth.id} className="p-3 bg-white rounded-md border border-neutral-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {TOOTH_CONDITIONS.find(c => c.value === tooth.condition)?.label}
                            </Badge>
                            <span className="text-xs text-neutral-500">
                              {tooth.treatmentDate ? new Date(tooth.treatmentDate).toLocaleDateString('pt-BR') : 'Data não informada'}
                            </span>
                          </div>
                          {tooth.notes && (
                            <p className="text-sm text-neutral-700 mt-1">{tooth.notes}</p>
                          )}
                        </div>
                      ))}
                    {(!dentalChart || dentalChart.filter(tooth => tooth.toothNumber === selectedTooth).length === 0) && (
                      <p className="text-sm text-neutral-500 italic p-3 bg-white rounded-md border border-neutral-200">
                        Nenhum histórico encontrado para este dente
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!selectedTooth && (
        <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
          <CardContent className="text-center py-8">
            <Activity className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">Selecione um Dente</h3>
            <p className="text-neutral-600">
              Clique em qualquer dente no mapa dentário acima para visualizar e editar suas informações clínicas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
