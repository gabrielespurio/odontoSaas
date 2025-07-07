import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { DentalChart } from "@/lib/types";

const FDI_UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const FDI_UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
const FDI_LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];
const FDI_LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];

const TOOTH_CONDITIONS = [
  { value: "healthy", label: "Sadio", color: "fill-gray-200 stroke-gray-400" },
  { value: "carie", label: "Cárie", color: "fill-red-200 stroke-red-600" },
  { value: "restoration", label: "Restauração", color: "fill-yellow-200 stroke-yellow-600" },
  { value: "extraction", label: "Extração", color: "fill-gray-100 stroke-gray-500 stroke-dasharray-[5,5]" },
  { value: "planned_treatment", label: "Tratamento Planejado", color: "fill-blue-200 stroke-blue-600" },
  { value: "completed_treatment", label: "Tratamento Realizado", color: "fill-green-200 stroke-green-600" },
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
      <g key={toothNumber} onClick={() => handleToothClick(toothNumber)}>
        <rect
          x={x}
          y={y}
          width="30"
          height="40"
          rx="5"
          className={`${colorClass} ${isSelected ? 'stroke-blue-800 stroke-2' : 'stroke-2'} dental-tooth cursor-pointer hover:scale-105 transition-transform`}
        />
        <text
          x={x + 15}
          y={y + 25}
          textAnchor="middle"
          className="text-xs font-medium fill-current"
        >
          {toothNumber}
        </text>
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Odontogram Chart */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Mapa Dentário</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Upper Jaw */}
              <div className="mb-6">
                <h5 className="text-sm font-medium text-neutral-700 mb-2">Arcada Superior</h5>
                <div className="flex justify-center">
                  <svg width="640" height="120" viewBox="0 0 640 120" className="border border-neutral-200 rounded-lg bg-white">
                    {/* Upper right teeth */}
                    {FDI_UPPER_RIGHT.map((tooth, index) => renderTooth(tooth, 20 + index * 40, 20))}
                    {/* Upper left teeth */}
                    {FDI_UPPER_LEFT.map((tooth, index) => renderTooth(tooth, 340 + index * 40, 20))}
                  </svg>
                </div>
              </div>

              {/* Lower Jaw */}
              <div>
                <h5 className="text-sm font-medium text-neutral-700 mb-2">Arcada Inferior</h5>
                <div className="flex justify-center">
                  <svg width="640" height="120" viewBox="0 0 640 120" className="border border-neutral-200 rounded-lg bg-white">
                    {/* Lower right teeth */}
                    {FDI_LOWER_RIGHT.map((tooth, index) => renderTooth(tooth, 20 + index * 40, 60))}
                    {/* Lower left teeth */}
                    {FDI_LOWER_LEFT.map((tooth, index) => renderTooth(tooth, 340 + index * 40, 60))}
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {TOOTH_CONDITIONS.map((condition) => (
                  <div key={condition.value} className="flex items-center">
                    <div className={`w-4 h-4 rounded mr-3 ${condition.color.replace('stroke-', 'border-').replace('fill-', 'bg-')}`}></div>
                    <span className="text-sm">{condition.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Condition Selector */}
          {selectedTooth && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dente {selectedTooth}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Condição</label>
                  <select
                    value={selectedCondition}
                    onChange={(e) => setSelectedCondition(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded-lg"
                  >
                    {TOOTH_CONDITIONS.map((condition) => (
                      <option key={condition.value} value={condition.value}>
                        {condition.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded-lg"
                    rows={3}
                    placeholder="Observações sobre o dente..."
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleUpdateTooth}
                    disabled={updateToothMutation.isPending}
                    className="flex-1"
                  >
                    {updateToothMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTooth(null)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tooth History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico do Dente</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTooth ? (
                <div className="space-y-2">
                  {dentalChart
                    ?.filter(tooth => tooth.toothNumber === selectedTooth)
                    .map((tooth) => (
                      <div key={tooth.id} className="p-2 bg-neutral-50 rounded">
                        <p className="text-sm font-medium">{TOOTH_CONDITIONS.find(c => c.value === tooth.condition)?.label}</p>
                        {tooth.notes && <p className="text-xs text-neutral-600">{tooth.notes}</p>}
                        <p className="text-xs text-neutral-500">
                          {tooth.treatmentDate ? new Date(tooth.treatmentDate).toLocaleDateString('pt-BR') : 'Data não informada'}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-600">Selecione um dente para ver seu histórico</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
