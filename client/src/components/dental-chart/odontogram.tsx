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
import { Activity, Save, X, History, Calendar } from "lucide-react";
import type { DentalChart } from "@/lib/types";

const FDI_UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const FDI_UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
const FDI_LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];
const FDI_LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];

const TOOTH_CONDITIONS = [
  { value: "healthy", label: "Sadio", color: "#D4EDDA", borderColor: "#28A745", bgColor: "bg-green-100", textColor: "text-green-800" },
  { value: "carie", label: "Cárie", color: "#F8D7DA", borderColor: "#DC3545", bgColor: "bg-red-100", textColor: "text-red-800" },
  { value: "restoration", label: "Restauração", color: "#FFF3CD", borderColor: "#FFC107", bgColor: "bg-yellow-100", textColor: "text-yellow-800" },
  { value: "extraction", label: "Extração", color: "#F8F9FA", borderColor: "#6C757D", bgColor: "bg-gray-100", textColor: "text-gray-800" },
  { value: "planned_treatment", label: "Tratamento Planejado", color: "#CCE5FF", borderColor: "#007BFF", bgColor: "bg-blue-100", textColor: "text-blue-800" },
  { value: "completed_treatment", label: "Tratamento Realizado", color: "#D1ECF1", borderColor: "#17A2B8", bgColor: "bg-cyan-100", textColor: "text-cyan-800" },
];

// SVG tooth shapes based on real dental anatomy
const TOOTH_SHAPES = {
  // Incisors (front teeth)
  incisor: `M12 2 C16 2 20 6 20 12 L20 24 C20 28 16 32 12 32 C8 32 4 28 4 24 L4 12 C4 6 8 2 12 2 Z`,
  // Canines (pointed teeth)
  canine: `M12 2 C17 2 21 6 21 12 L21 22 C21 26 19 30 16 32 L8 32 C5 30 3 26 3 22 L3 12 C3 6 7 2 12 2 Z`,
  // Premolars (bicuspids)
  premolar: `M12 4 C18 4 22 8 22 14 L22 20 C22 26 18 30 12 30 C6 30 2 26 2 20 L2 14 C2 8 6 4 12 4 Z M8 12 L16 12 M10 16 L14 16`,
  // Molars (back teeth)
  molar: `M12 6 C19 6 24 10 24 16 L24 22 C24 28 19 32 12 32 C5 32 0 28 0 22 L0 16 C0 10 5 6 12 6 Z M6 14 L18 14 M6 18 L18 18 M8 22 L16 22`
};

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

  const handleUpdateTooth = async () => {
    if (!selectedTooth || !patientId || !selectedCondition) return;

    try {
      const updateData = {
        patientId: Number(patientId),
        toothNumber: selectedTooth,
        condition: selectedCondition as any,
        notes: notes || "",
        treatmentDate: new Date().toISOString().split('T')[0]
      };

      console.log('Updating tooth with data:', updateData);
      
      await updateToothMutation.mutateAsync(updateData);
      
      toast({
        title: "Sucesso",
        description: `Dente ${selectedTooth} atualizado com sucesso`,
      });
    } catch (error) {
      console.error('Error updating tooth:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar condição do dente",
        variant: "destructive",
      });
    }
  };

  const renderTooth = (toothNumber: string, x: number, y: number) => {
    const isSelected = selectedTooth === toothNumber;
    const condition = getToothCondition(toothNumber);
    const conditionInfo = TOOTH_CONDITIONS.find(c => c.value === condition);
    
    // Use white for healthy teeth, legend colors for conditions
    const toothColor = condition === "healthy" || !condition ? "#FFFFFF" : conditionInfo?.color || "#FFFFFF";
    const borderColor = condition === "healthy" || !condition ? "#D1D5DB" : conditionInfo?.borderColor || "#D1D5DB";
    
    return (
      <g key={toothNumber} onClick={() => handleToothClick(toothNumber)} className="cursor-pointer">
        <defs>
          <filter id={`shadow-${toothNumber}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.1"/>
          </filter>
          {isSelected && (
            <filter id={`glow-${toothNumber}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
          )}
        </defs>
        
        <rect
          x={x}
          y={y}
          width="26"
          height="30"
          rx="4"
          fill={toothColor}
          stroke={isSelected ? "#00796B" : borderColor}
          strokeWidth={isSelected ? "3" : "2"}
          className="transition-all duration-200 hover:drop-shadow-md"
          style={{
            filter: isSelected ? `url(#glow-${toothNumber})` : `url(#shadow-${toothNumber})`
          }}
        />
        
        <text
          x={x + 13}
          y={y + 20}
          textAnchor="middle"
          className={`text-xs font-semibold pointer-events-none transition-colors duration-200 ${
            isSelected ? 'fill-primary' : 'fill-neutral-700'
          }`}
        >
          {toothNumber}
        </text>
        
        {isSelected && (
          <circle
            cx={x + 22}
            cy={y + 4}
            r="2"
            fill="#00796B"
            className="animate-pulse"
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
    <div className="space-y-6" style={{ paddingBottom: '120px' }}>
      {/* Main Dental Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-4 h-4 text-primary" />
            Mapa Dentário Interativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upper Jaw */}
          <div>
            <h3 className="text-base font-semibold text-neutral-800 mb-3 text-center">Arcada Superior</h3>
            <div className="flex justify-center dental-chart-container">
              <svg 
                width="100%" 
                height="80" 
                viewBox="0 0 580 80" 
                className="dental-chart-svg max-w-full border border-neutral-200 rounded-lg bg-gradient-to-b from-white to-neutral-50 shadow-inner"
              >
                {/* Upper right teeth */}
                {FDI_UPPER_RIGHT.map((tooth, index) => renderTooth(tooth, 15 + index * 32, 15))}
                {/* Upper left teeth */}
                {FDI_UPPER_LEFT.map((tooth, index) => renderTooth(tooth, 295 + index * 32, 15))}
                
                {/* Central divider line */}
                <line x1="290" y1="10" x2="290" y2="70" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="3,3" />
              </svg>
            </div>
          </div>

          {/* Lower Jaw */}
          <div>
            <h3 className="text-base font-semibold text-neutral-800 mb-3 text-center">Arcada Inferior</h3>
            <div className="flex justify-center dental-chart-container">
              <svg 
                width="100%" 
                height="80" 
                viewBox="0 0 580 80" 
                className="dental-chart-svg max-w-full border border-neutral-200 rounded-lg bg-gradient-to-t from-white to-neutral-50 shadow-inner"
              >
                {/* Lower right teeth */}
                {FDI_LOWER_RIGHT.map((tooth, index) => renderTooth(tooth, 15 + index * 32, 25))}
                {/* Lower left teeth */}
                {FDI_LOWER_LEFT.map((tooth, index) => renderTooth(tooth, 295 + index * 32, 25))}
                
                {/* Central divider line */}
                <line x1="290" y1="10" x2="290" y2="70" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="3,3" />
              </svg>
            </div>
          </div>

          {/* Legend - Compact */}
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="flex flex-wrap gap-4 justify-center">
              {TOOTH_CONDITIONS.map((condition) => (
                <div key={condition.value} className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded border" 
                    style={{ 
                      backgroundColor: condition.color, 
                      borderColor: condition.borderColor 
                    }}
                  ></div>
                  <span className="text-xs font-medium text-neutral-700">{condition.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tooth Editor - Below the chart - Compact Layout */}
      {selectedTooth && (
        <Card className="tooth-editor-card tooth-editor-container shadow-sm border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs">
                  {selectedTooth}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Editando Dente {selectedTooth}</h3>
                  <p className="text-xs text-neutral-600">Defina a condição e adicione observações</p>
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
          <CardContent className="pt-0 space-y-4">
            {/* Condition and Notes - Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condition" className="text-sm font-semibold">Condição do Dente</Label>
                <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a condição" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOTH_CONDITIONS.map((condition) => (
                      <SelectItem key={condition.value} value={condition.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded border" 
                            style={{ 
                              backgroundColor: condition.color, 
                              borderColor: condition.borderColor 
                            }}
                          ></div>
                          <span className="text-sm">{condition.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-semibold">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[70px] resize-none"
                  placeholder="Descreva detalhes sobre o tratamento..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleUpdateTooth}
                disabled={updateToothMutation.isPending}
                className="flex-1"
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateToothMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedTooth(null)}
                size="sm"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>

            {/* History - Enhanced Design */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2 text-neutral-800">
                <History className="w-4 h-4 text-primary" />
                Histórico do Dente
              </Label>
              <div className="space-y-3 max-h-40 overflow-y-auto bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg p-4 border border-neutral-200">
                {dentalChart
                  ?.filter(tooth => tooth.toothNumber === selectedTooth)
                  .map((tooth) => {
                    const conditionInfo = TOOTH_CONDITIONS.find(c => c.value === tooth.condition);
                    return (
                      <div key={tooth.id} className="bg-white rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                        {/* Header with condition and date */}
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-neutral-50 to-white border-b border-neutral-100">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full border-2" 
                              style={{ 
                                backgroundColor: conditionInfo?.color || '#f8f9fa', 
                                borderColor: conditionInfo?.borderColor || '#6c757d' 
                              }}
                            ></div>
                            <Badge 
                              className={`text-xs font-medium ${conditionInfo?.bgColor} ${conditionInfo?.textColor}`}
                              variant="secondary"
                            >
                              {conditionInfo?.label || 'Condição desconhecida'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-neutral-500">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {tooth.treatmentDate ? new Date(tooth.treatmentDate).toLocaleDateString('pt-BR') : 'Sem data'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Notes section */}
                        {tooth.notes ? (
                          <div className="p-3">
                            <div className="flex items-start gap-2">
                              <div className="w-1 h-4 bg-primary rounded-full mt-1 flex-shrink-0"></div>
                              <div className="flex-1">
                                <p className="text-sm text-neutral-700 leading-relaxed">{tooth.notes}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 text-center">
                            <p className="text-xs text-neutral-400 italic">Nenhuma observação registrada</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                {(!dentalChart || dentalChart.filter(tooth => tooth.toothNumber === selectedTooth).length === 0) && (
                  <div className="text-center py-6">
                    <History className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="text-sm text-neutral-500 font-medium">Nenhum histórico encontrado</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Os tratamentos realizados neste dente aparecerão aqui
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!selectedTooth && (
        <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
          <CardContent className="text-center py-6">
            <Activity className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-neutral-700 mb-2">Selecione um Dente</h3>
            <p className="text-sm text-neutral-600">
              Clique em qualquer dente no mapa dentário acima para visualizar e editar suas informações clínicas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
